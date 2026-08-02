"""OWASP Dependency-Check integration for VulnScan AI.

This scanner:
- runs OWASP Dependency-Check
- reads real vulnerabilities
- extracts installed versions
- extracts CVSS scores and severity
- enriches GHSA advisories using GitHub's public advisory API
- attempts to determine fixed versions
- generates AI remediation suggestions using llm_fix_generator.py
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from llm_fix_generator import generate_ai_fix


logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

DEPENDENCY_CHECK_PATH = os.getenv(
    "DEPENDENCY_CHECK_PATH",
    r"C:\Users\jsoni\Downloads\dependency-check-12.2.2-release"
    r"\dependency-check\bin\dependency-check.bat",
)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

GITHUB_API_VERSION = os.getenv(
    "GITHUB_API_VERSION",
    "2022-11-28",
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEBUG_REPORT_DIR = PROJECT_ROOT / "owasp-results"

DEBUG_REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# REGULAR EXPRESSIONS
# ============================================================

SEMVER_RE = re.compile(
    r"\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b"
)

GHSA_RE = re.compile(
    r"^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$",
    re.IGNORECASE,
)


# ============================================================
# SAFE TYPE HELPERS
# ============================================================

def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return cast(dict[str, Any], value)

    return {}


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return cast(list[Any], value)

    return []


def _safe_float(value: Any) -> float:
    try:
        if value is None:
            return 0.0

        return float(value)

    except (TypeError, ValueError):
        return 0.0


# ============================================================
# SEVERITY
# ============================================================

def _normalize_severity(value: str) -> str:

    normalized = value.strip().upper()

    if normalized == "MODERATE":
        return "MEDIUM"

    if normalized in {
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW",
        "UNKNOWN",
    }:
        return normalized

    return "UNKNOWN"


def _severity_from_score(score: float) -> str:

    if score >= 9.0:
        return "CRITICAL"

    if score >= 7.0:
        return "HIGH"

    if score >= 4.0:
        return "MEDIUM"

    if score > 0:
        return "LOW"

    return "UNKNOWN"


# ============================================================
# CVSS
# ============================================================

def _extract_cvss_score(
    cvss_data: Any,
) -> float:

    data = _as_dict(cvss_data)

    if not data:
        return 0.0

    score = _safe_float(
        data.get("baseScore")
    )

    if score > 0:
        return score

    nested = _as_dict(
        data.get("cvssData")
    )

    score = _safe_float(
        nested.get("baseScore")
    )

    if score > 0:
        return score

    # CVSS v2 can sometimes use "score"
    score = _safe_float(
        data.get("score")
    )

    if score > 0:
        return score

    return 0.0


def _extract_cvss_severity(
    cvss_data: Any,
) -> str | None:

    data = _as_dict(cvss_data)

    if not data:
        return None

    severity = data.get(
        "baseSeverity"
    )

    if severity:
        return _normalize_severity(
            str(severity)
        )

    severity = data.get(
        "severity"
    )

    if severity:
        return _normalize_severity(
            str(severity)
        )

    nested = _as_dict(
        data.get("cvssData")
    )

    severity = nested.get(
        "baseSeverity"
    )

    if severity:
        return _normalize_severity(
            str(severity)
        )

    severity = nested.get(
        "severity"
    )

    if severity:
        return _normalize_severity(
            str(severity)
        )

    return None


def _get_cvss_score(
    vulnerability: dict[str, Any],
) -> float:

    for key in (
        "cvssv4",
        "cvssv3",
        "cvssv2",
    ):

        score = _extract_cvss_score(
            vulnerability.get(key)
        )

        if score > 0:
            return score

    return 0.0


def _get_severity(
    vulnerability: dict[str, Any],
) -> str:

    for key in (
        "cvssv4",
        "cvssv3",
        "cvssv2",
    ):

        severity = _extract_cvss_severity(
            vulnerability.get(key)
        )

        if severity:
            return severity

    direct_severity = vulnerability.get(
        "severity"
    )

    if direct_severity:

        return _normalize_severity(
            str(direct_severity)
        )

    unscored_severity = vulnerability.get(
        "unscoredSeverity"
    )

    if unscored_severity:

        return _normalize_severity(
            str(unscored_severity)
        )

    return _severity_from_score(
        _get_cvss_score(vulnerability)
    )


# ============================================================
# DEPENDENCY INFORMATION
# ============================================================

def _get_dependency_name(
    dependency: dict[str, Any],
) -> str:

    return str(
        dependency.get("fileName")
        or dependency.get("filePath")
        or "Unknown dependency"
    )


def _get_installed_version(
    dependency: dict[str, Any],
) -> str:

    evidence = _as_dict(
        dependency.get(
            "evidenceCollected"
        )
    )

    version_evidence = _as_list(
        evidence.get(
            "versionEvidence"
        )
    )

    confidence_rank = {
        "HIGHEST": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
    }

    best_value = "Unknown"
    best_rank = -1

    for item in version_evidence:

        entry = _as_dict(item)

        value = entry.get("value")

        if not value:
            continue

        confidence = str(
            entry.get(
                "confidence",
                "",
            )
        ).upper()

        rank = confidence_rank.get(
            confidence,
            0,
        )

        if rank > best_rank:

            best_rank = rank

            best_value = str(
                value
            )

    return best_value


# ============================================================
# PACKAGE NAME
# ============================================================

def _normalize_package_name(
    dependency_name: str,
) -> str:

    dependency_name = (
        dependency_name.strip()
    )

    # Windows path
    if re.match(
        r"^[A-Za-z]:\\",
        dependency_name,
    ):
        return dependency_name

    if ":" not in dependency_name:
        return dependency_name

    package_part, version_part = (
        dependency_name.rsplit(
            ":",
            1,
        )
    )

    if SEMVER_RE.search(
        version_part
    ):
        return package_part.strip()

    return dependency_name


# ============================================================
# GHSA
# ============================================================

def _extract_ghsa_id(
    vulnerability: dict[str, Any],
) -> str:

    name = str(
        vulnerability.get(
            "name",
            "",
        )
    ).strip()

    if GHSA_RE.match(name):
        return name.upper()

    return ""


# ============================================================
# VERSION EXTRACTION
# ============================================================

def _extract_first_version(
    text: str,
) -> str:

    matches = SEMVER_RE.findall(
        text
    )

    if matches:
        return matches[0].strip()

    return ""


def _extract_fixed_version_from_description(
    description: str,
) -> str:

    if not description:
        return ""

    patterns = [
        r"fixed in[:\s]+([^\n\r]+)",
        r"patched in[:\s]+([^\n\r]+)",
        r"first patched version[:\s\-]+([^\n\r]+)",
        r"vulnerability has been fixed in[:\s]+([^\n\r]+)",
        r"upgrade to version[:\s]+([^\n\r]+)",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            description,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        block = match.group(1).strip()

        version = _extract_first_version(
            block
        )

        if version:
            return version

    return ""


# ============================================================
# GITHUB ADVISORY API
# ============================================================

_GITHUB_ADVISORY_CACHE: dict[
    str,
    dict[str, Any],
] = {}


def _fetch_github_advisory(
    ghsa_id: str,
) -> dict[str, Any]:

    ghsa_id = (
        ghsa_id.strip().upper()
    )

    if not ghsa_id:
        return {}

    cached = _GITHUB_ADVISORY_CACHE.get(
        ghsa_id
    )

    if cached is not None:
        return cached

    url = (
        "https://api.github.com"
        f"/advisories/{ghsa_id}"
    )

    headers = {
        "Accept":
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            GITHUB_API_VERSION,

        "User-Agent":
            "VulnScanAI/1.0",
    }

    if GITHUB_TOKEN:

        headers[
            "Authorization"
        ] = f"Bearer {GITHUB_TOKEN}"

    request = Request(
        url,
        headers=headers,
        method="GET",
    )

    try:

        with urlopen(
            request,
            timeout=15,
        ) as response:

            payload = (
                response
                .read()
                .decode(
                    "utf-8",
                    errors="replace",
                )
            )

            data = json.loads(
                payload
            )

            if isinstance(
                data,
                dict,
            ):

                advisory = cast(
                    dict[str, Any],
                    data,
                )

                _GITHUB_ADVISORY_CACHE[
                    ghsa_id
                ] = advisory

                return advisory

    except (
        HTTPError,
        URLError,
        TimeoutError,
        json.JSONDecodeError,
        OSError,
    ) as exc:

        logger.warning(
            "GitHub advisory lookup failed for %s: %s",
            ghsa_id,
            exc,
        )

    _GITHUB_ADVISORY_CACHE[
        ghsa_id
    ] = {}

    return {}


# ============================================================
# GITHUB FIXED VERSION
# ============================================================

def _extract_fixed_version_from_github_advisory(
    advisory: dict[str, Any],
    package_name: str,
) -> str:

    if not advisory:
        return ""

    vulnerabilities = _as_list(
        advisory.get(
            "vulnerabilities"
        )
    )

    normalized_package = (
        package_name
        .strip()
        .lower()
    )

    fallback_version = ""

    for item in vulnerabilities:

        vulnerability = _as_dict(
            item
        )

        first_patched = (
            vulnerability.get(
                "first_patched_version"
            )
        )

        if not first_patched:
            continue

        candidate_version = str(
            first_patched
        ).strip()

        if not candidate_version:
            continue

        package = _as_dict(
            vulnerability.get(
                "package"
            )
        )

        advisory_package = str(
            package.get(
                "name",
                "",
            )
        ).strip().lower()

        if (
            normalized_package
            and advisory_package
            and normalized_package
            == advisory_package
        ):

            return candidate_version

        if not fallback_version:

            fallback_version = (
                candidate_version
            )

    return fallback_version


# ============================================================
# GITHUB ENRICHMENT
# ============================================================

def _enrich_from_github_advisory(
    ghsa_id: str,
    package_name: str,
) -> dict[str, Any]:

    advisory = (
        _fetch_github_advisory(
            ghsa_id
        )
    )

    if not advisory:
        return {}

    severity = advisory.get(
        "severity"
    )

    normalized_severity = "UNKNOWN"

    if severity:

        normalized_severity = (
            _normalize_severity(
                str(severity)
            )
        )

    cvss_score = 0.0

    cvss = _as_dict(
        advisory.get("cvss")
    )

    if cvss:

        cvss_score = _safe_float(
            cvss.get("score")
        )

    if cvss_score <= 0:

        cvss_severities = _as_dict(
            advisory.get(
                "cvss_severities"
            )
        )

        cvss_v3 = _as_dict(
            cvss_severities.get(
                "cvss_v3"
            )
        )

        cvss_v4 = _as_dict(
            cvss_severities.get(
                "cvss_v4"
            )
        )

        cvss_score = max(
            _safe_float(
                cvss_v3.get("score")
            ),
            _safe_float(
                cvss_v4.get("score")
            ),
        )

    fixed_version = (
        _extract_fixed_version_from_github_advisory(
            advisory,
            package_name,
        )
    )

    return {
        "severity":
            normalized_severity,

        "cvss_score":
            cvss_score,

        "fixed_version":
            fixed_version,
    }


# ============================================================
# FIXED VERSION
# ============================================================

def _get_fixed_version(
    vulnerability: dict[str, Any],
    dependency_name: str,
) -> str:

    existing = str(
        vulnerability.get(
            "fixed_version",
            "",
        )
    ).strip()

    if existing:
        return existing

    ghsa_id = _extract_ghsa_id(
        vulnerability
    )

    if ghsa_id:

        enrichment = (
            _enrich_from_github_advisory(
                ghsa_id,
                _normalize_package_name(
                    dependency_name
                ),
            )
        )

        fixed_version = str(
            enrichment.get(
                "fixed_version",
                "",
            )
        ).strip()

        if fixed_version:
            return fixed_version

    description = str(
        vulnerability.get(
            "description",
            "",
        )
    ).strip()

    extracted = (
        _extract_fixed_version_from_description(
            description
        )
    )

    if extracted:
        return extracted

    return "Check advisory"


# ============================================================
# REFERENCE URL
# ============================================================

def _get_reference_url(
    vulnerability: dict[str, Any],
) -> str:

    references = _as_list(
        vulnerability.get(
            "references"
        )
    )

    for reference in references:

        ref = _as_dict(
            reference
        )

        url = ref.get(
            "url"
        )

        if url:
            return str(url)

    return ""


# ============================================================
# BUILD ONE VULNERABILITY RECORD
# ============================================================

def _build_vulnerability_record(
    dependency: dict[str, Any],
    vulnerability: dict[str, Any],
) -> dict[str, Any]:

    dependency_name = (
        _get_dependency_name(
            dependency
        )
    )

    package_name = (
        _normalize_package_name(
            dependency_name
        )
    )

    installed_version = (
        _get_installed_version(
            dependency
        )
    )

    cve_id = str(
        vulnerability.get(
            "name",
            "UNKNOWN",
        )
    ).strip()

    description = str(
        vulnerability.get(
            "description",
            "No vulnerability description available.",
        )
    ).strip()

    severity = (
        _get_severity(
            vulnerability
        )
    )

    cvss_score = (
        _get_cvss_score(
            vulnerability
        )
    )

    # ========================================================
    # GITHUB ADVISORY ENRICHMENT
    # ========================================================

    ghsa_id = _extract_ghsa_id(
        vulnerability
    )

    advisory_enrichment: dict[
        str,
        Any,
    ] = {}

    if ghsa_id:

        advisory_enrichment = (
            _enrich_from_github_advisory(
                ghsa_id,
                package_name,
            )
        )

        if severity == "UNKNOWN":

            enriched_severity = str(
                advisory_enrichment.get(
                    "severity",
                    "",
                )
            ).strip()

            if enriched_severity:

                severity = (
                    _normalize_severity(
                        enriched_severity
                    )
                )

        if cvss_score <= 0:

            enriched_score = (
                _safe_float(
                    advisory_enrichment.get(
                        "cvss_score"
                    )
                )
            )

            if enriched_score > 0:
                cvss_score = enriched_score

    # ========================================================
    # FIXED VERSION
    # ========================================================

    fixed_version = str(
        advisory_enrichment.get(
            "fixed_version",
            "",
        )
    ).strip()

    if not fixed_version:

        fixed_version = (
            _get_fixed_version(
                vulnerability,
                dependency_name,
            )
        )

    # ========================================================
    # FALLBACK SEVERITY FROM SCORE
    # ========================================================

    if (
        severity == "UNKNOWN"
        and cvss_score > 0
    ):

        severity = (
            _severity_from_score(
                cvss_score
            )
        )

    # ========================================================
    # BASE RECORD
    # ========================================================

    record: dict[str, Any] = {

        "cve_id":
            cve_id,

        "dependency":
            dependency_name,

        "package_name":
            package_name,

        "installed_version":
            installed_version,

        "fixed_version":
            fixed_version,

        "severity":
            severity,

        "cvss_score":
            cvss_score,

        "description":
            description,

        "reference_url":
            _get_reference_url(
                vulnerability
            ),
    }

    # ========================================================
    # AI REMEDIATION
    # ========================================================

    # ========================================================
    # SIMPLE FIX SUGGESTION
    # ========================================================

    fix_suggestion = (
        f"Upgrade {package_name} from "
        f"{installed_version} to {fixed_version}."
    )

    fix_confidence = "LOW"

    record["suggested_fix"] = fix_suggestion
    record["fix_suggestion"] = fix_suggestion
    record["fix_confidence"] = fix_confidence

    return record

# ============================================================
# PARSE OWASP REPORT
# ============================================================

def _parse_report(
    report_path: Path,
) -> dict[str, Any]:

    try:

        with report_path.open(
            "r",
            encoding="utf-8",
        ) as report_file:

            report = json.load(
                report_file
            )

    except (
        OSError,
        json.JSONDecodeError,
    ) as exc:

        raise RuntimeError(
            "Unable to read OWASP scan report."
        ) from exc

    dependencies = report.get(
        "dependencies",
        []
    )

    if not isinstance(
        dependencies,
        list,
    ):

        dependencies = []

    vulnerabilities: list[
        dict[str, Any]
    ] = []

    for dependency_value in dependencies:

        if not isinstance(
            dependency_value,
            dict,
        ):
            continue

        dependency = cast(
            dict[str, Any],
            dependency_value,
        )

        dependency_vulnerabilities = (
            dependency.get(
                "vulnerabilities",
                [],
            )
            or []
        )

        if not isinstance(
            dependency_vulnerabilities,
            list,
        ):
            continue

        for vulnerability_value in dependency_vulnerabilities:

            if not isinstance(
                vulnerability_value,
                dict,
            ):
                continue

            vulnerability = cast(
                dict[str, Any],
                vulnerability_value,
            )

            record = (
                _build_vulnerability_record(
                    dependency,
                    vulnerability,
                )
            )

            vulnerabilities.append(
                record
            )

    dependencies_scanned = len(
        dependencies
    )

    return {
        "vulnerabilities":
            vulnerabilities,

        "dependencies_scanned":
            dependencies_scanned,
    }


# ============================================================
# RUN OWASP DEPENDENCY-CHECK
# ============================================================

def run_owasp_scan(
    repo_path: str,
) -> dict[str, Any]:

    repository = Path(
        repo_path
    ).resolve()

    # ========================================================
    # VALIDATE REPOSITORY
    # ========================================================

    if (
        not repository.exists()
        or not repository.is_dir()
    ):

        raise ValueError(
            "Repository path does not exist."
        )

    # ========================================================
    # VALIDATE OWASP
    # ========================================================

    dependency_check = Path(
        DEPENDENCY_CHECK_PATH
    )

    if not dependency_check.exists():

        raise RuntimeError(
            "OWASP Dependency-Check executable "
            "was not found. "
            "Check DEPENDENCY_CHECK_PATH."
        )

    # ========================================================
    # TEMPORARY OUTPUT DIRECTORY
    # ========================================================

    with tempfile.TemporaryDirectory(
        prefix="vulnscan_report_"
    ) as output_dir:

        command = [

            str(dependency_check),

            "--project",
            "VulnScanAI",

            "--scan",
            str(repository),

            "--exclude",
            "**/node_modules/**",

            "--exclude",
            "**/.next/**",

            "--exclude",
            "**/.venv/**",

            "--format",
            "JSON",

            "--out",
            output_dir,

            "--noupdate",
        ]

        logger.info(
            "Starting OWASP Dependency-Check scan."
        )

        # ====================================================
        # RUN OWASP
        # ====================================================

        try:

            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )

        except subprocess.TimeoutExpired as exc:

            raise RuntimeError(
                "OWASP Dependency-Check exceeded "
                "the 10-minute scan limit."
            ) from exc

        except OSError as exc:

            raise RuntimeError(
                "Unable to start "
                "OWASP Dependency-Check."
            ) from exc

                # ====================================================
        # FIND REPORT
        # ====================================================

        report_path = (
            Path(output_dir)
            / "dependency-check-report.json"
        )

        print("=" * 80)
        print("OWASP STDOUT:\n", result.stdout)
        print("OWASP STDERR:\n", result.stderr)
        print("=" * 80)

        if not report_path.exists():

            logger.error(
                "Dependency-Check failed. "
                "stdout=%s stderr=%s",
                result.stdout[-2000:],
                result.stderr[-2000:],
            )

            raise RuntimeError(
                "OWASP Dependency-Check did not "
                "generate a JSON report."
            )

        # ====================================================
        # SAVE DEBUG COPY
        # ====================================================

        saved_report = (
            DEBUG_REPORT_DIR
            / "dependency-check-report.json"
        )

        try:

            shutil.copy2(
                report_path,
                saved_report,
            )

            logger.info(
                "Raw OWASP report saved to: %s",
                saved_report,
            )

        except OSError as exc:

            logger.warning(
                "Could not save debug report: %s",
                exc,
            )

        # ====================================================
        # PARSE + AI ENRICHMENT
        # ====================================================

        scan_data = _parse_report(
            report_path
        )

        logger.info(
            "OWASP scan completed. "
            "%d vulnerabilities found. "
            "%d dependencies scanned.",
            len(
                scan_data["vulnerabilities"]
            ),
            scan_data["dependencies_scanned"],
        )

        # ====================================================
        # RETURN FINAL RESULT
        # ====================================================

        return scan_data