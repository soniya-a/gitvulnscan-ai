"""FastAPI entry point for the VulnScan AI backend."""

import logging
import time
import traceback
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import CloneTestResponse, ScanRequest
from scanner import run_owasp_scan
from utils import cleanup_repo, clone_repo, count_repository_files

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VulnScan AI API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:4028",
    "http://127.0.0.1:4028",
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    "https://gitvulnscan-idpewm8y-soniya-as-projects.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


# ============================================================
# TEST CLONE
# ============================================================

@app.post("/api/test-clone", response_model=CloneTestResponse)
async def test_clone(request: ScanRequest) -> CloneTestResponse:

    local_path: str | None = None

    try:
        local_path = clone_repo(str(request.repo_url))

        file_count = count_repository_files(local_path)

        return CloneTestResponse(
            status="success",
            repository=str(request.repo_url),
            files_found=file_count,
            cleanup="Repository deleted successfully after inspection.",
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        logger.exception("Repository clone failed")

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    finally:
        if local_path:
            cleanup_repo(local_path)


# ============================================================
# REAL SCAN
# ============================================================

@app.post("/api/scan")
async def scan_repository(request: ScanRequest) -> dict[str, Any]:

    local_path: str | None = None
    repo_url = str(request.repo_url)
    start_time = time.time()

    try:

        logger.info("Cloning repository: %s", repo_url)

        local_path = clone_repo(repo_url)

        logger.info("Starting OWASP scan: %s", repo_url)

        scan_data = run_owasp_scan(local_path)

        vulnerabilities = scan_data.get("vulnerabilities", [])
        dependencies_scanned = scan_data.get("dependencies_scanned", 0)

        severity_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "unknown": 0,
        }

        for vulnerability in vulnerabilities:

            severity = str(
                vulnerability.get("severity", "UNKNOWN")
            ).upper()

            if severity == "CRITICAL":
                severity_counts["critical"] += 1
            elif severity == "HIGH":
                severity_counts["high"] += 1
            elif severity == "MEDIUM":
                severity_counts["medium"] += 1
            elif severity == "LOW":
                severity_counts["low"] += 1
            else:
                severity_counts["unknown"] += 1

        duration_seconds = round(
            time.time() - start_time,
            2,
        )

        logger.info(
            "FINAL SCAN RESULT -> vulnerabilities=%d dependencies=%d duration=%.2fs",
            len(vulnerabilities),
            dependencies_scanned,
            duration_seconds,
        )

        return {
            "status": "completed",
            "repo_url": repo_url,
            "total_vulnerabilities": len(vulnerabilities),
            "dependencies_scanned": dependencies_scanned,
            "duration_seconds": duration_seconds,
            "severity_counts": severity_counts,
            "vulnerabilities": vulnerabilities,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        traceback.print_exc()

        logger.exception(
            "Repository scan failed for %s",
            repo_url,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        traceback.print_exc()

        logger.exception(
            "Unexpected error while scanning %s",
            repo_url,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    finally:
        if local_path:
            cleanup_repo(local_path)

            logger.info(
                "Temporary repository removed."
            )