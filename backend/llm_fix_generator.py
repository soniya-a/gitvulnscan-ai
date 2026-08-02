"""AI remediation generator for VulnScan AI using Google Gemini."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai


# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

# Current file:
# D:\cyberapp\backend\llm_fix_generator.py
#
# Project root:
# D:\cyberapp
#
# Environment file:
# D:\cyberapp\.env

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOTENV_PATH = PROJECT_ROOT / ".env"

# Load .env BEFORE reading GEMINI_API_KEY.
load_dotenv(dotenv_path=DOTENV_PATH)


logger = logging.getLogger(__name__)


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
)


# ============================================================
# FALLBACK REMEDIATION
# ============================================================

def _fallback_fix(
    package_name: str,
    installed_version: str,
    fixed_version: str,
    advisory_id: str,
) -> str:
    """Return a safe fallback when Gemini is unavailable."""

    if (
        fixed_version
        and fixed_version.lower()
        not in {
            "check advisory",
            "unknown",
            "n/a",
            "",
        }
    ):
        return (
            f"Upgrade {package_name} from {installed_version} "
            f"to {fixed_version} or later. "
            f"Review advisory {advisory_id}, run the project's "
            f"tests, rebuild the application, and scan again."
        )

    return (
        f"Review advisory {advisory_id} for {package_name} "
        f"{installed_version}. Upgrade to a patched version "
        f"recommended by the official advisory, test the "
        f"application, rebuild it, and scan the repository again."
    )


# ============================================================
# GEMINI REMEDIATION GENERATOR
# ============================================================

def generate_ai_fix(
    vulnerability: dict[str, Any],
) -> dict[str, str]:
    """
    Generate an AI remediation suggestion for one vulnerability.

    OWASP Dependency-Check and GitHub advisories remain the
    sources of vulnerability facts.

    Gemini generates only remediation guidance.
    """

    # --------------------------------------------------------
    # READ VULNERABILITY DATA
    # --------------------------------------------------------

    package_name = str(
        vulnerability.get("package_name")
        or vulnerability.get("dependency")
        or "Unknown package"
    )

    installed_version = str(
        vulnerability.get("installed_version")
        or "Unknown"
    )

    fixed_version = str(
        vulnerability.get("fixed_version")
        or "Check advisory"
    )

    advisory_id = str(
        vulnerability.get("cve_id")
        or "Unknown advisory"
    )

    severity = str(
        vulnerability.get("severity")
        or "UNKNOWN"
    )

    cvss_score = vulnerability.get(
        "cvss_score",
        0,
    )

    description = str(
        vulnerability.get("description")
        or "No description available."
    )

    reference_url = str(
        vulnerability.get("reference_url")
        or ""
    )

    # --------------------------------------------------------
    # CREATE FALLBACK
    # --------------------------------------------------------

    fallback = _fallback_fix(
        package_name=package_name,
        installed_version=installed_version,
        fixed_version=fixed_version,
        advisory_id=advisory_id,
    )

    # --------------------------------------------------------
    # CHECK GEMINI CONFIGURATION
    # --------------------------------------------------------

    if not GEMINI_API_KEY:
        logger.warning(
            "GEMINI_API_KEY is missing. "
            "Using fallback remediation."
        )

        return {
            "fix_suggestion": fallback,
            "fix_confidence": "MEDIUM",
        }

    # --------------------------------------------------------
    # GEMINI PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are the AI remediation engine inside VulnScanAI,
a software dependency vulnerability scanner.

The vulnerability facts below were obtained from OWASP
Dependency-Check and security advisory sources.

Do not invent vulnerability facts, CVSS scores, versions,
or advisory information.

VULNERABILITY DATA

Advisory:
{advisory_id}

Package:
{package_name}

Installed version:
{installed_version}

Known fixed version:
{fixed_version}

Severity:
{severity}

CVSS:
{cvss_score}

Description:
{description}

Reference:
{reference_url}

TASK

Generate a concise and technically accurate remediation
for a software developer.

Rules:

1. Never invent a patched version.

2. If the known fixed version contains a real version,
recommend upgrading to that version or later.

3. If the fixed version is "Check advisory", "Unknown",
"N/A", or empty, explicitly tell the developer to verify
the exact patched version using the official advisory.

4. Give a package installation or update command only when
it can be safely inferred from the provided information.

5. Explain what should be tested after the dependency is
updated.

6. Do not repeat the vulnerability description.

7. Do not use Markdown headings.

8. Keep the remediation concise, approximately 60-130 words.

9. Do not claim a vulnerability is definitely fixed unless
a patched version is actually provided.

Return ONLY valid JSON in exactly this structure:

{{
  "fix_suggestion": "your remediation text",
  "fix_confidence": "HIGH or MEDIUM or LOW"
}}
"""

    # --------------------------------------------------------
    # CALL GEMINI
    # --------------------------------------------------------

    try:
        client = genai.Client(
            api_key=GEMINI_API_KEY,
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )

        text = response.text

        if not text:
            raise RuntimeError(
                "Gemini returned an empty response."
            )

        # ----------------------------------------------------
        # PARSE GEMINI JSON
        # ----------------------------------------------------

        data = json.loads(text)

        if not isinstance(data, dict):
            raise RuntimeError(
                "Gemini returned an unexpected JSON structure."
            )

        suggestion = str(
            data.get(
                "fix_suggestion",
                "",
            )
        ).strip()

        confidence = str(
            data.get(
                "fix_confidence",
                "MEDIUM",
            )
        ).strip().upper()

        if not suggestion:
            raise RuntimeError(
                "Gemini did not return a fix suggestion."
            )

        if confidence not in {
            "HIGH",
            "MEDIUM",
            "LOW",
        }:
            confidence = "MEDIUM"

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return {
            "fix_suggestion": suggestion,
            "fix_confidence": confidence,
        }

    # --------------------------------------------------------
    # GEMINI FAILURE MUST NOT BREAK OWASP SCAN
    # --------------------------------------------------------

    except Exception as exc:
        logger.warning(
            "Gemini remediation failed for %s: %s",
            advisory_id,
            exc,
        )

        return {
            "fix_suggestion": fallback,
            "fix_confidence": "LOW",
        }