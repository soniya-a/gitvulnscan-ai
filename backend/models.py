"""Pydantic models for VulnScan AI API requests and responses."""

from pydantic import BaseModel, HttpUrl


class ScanRequest(BaseModel):
    """Request model for repository scanning."""

    repo_url: HttpUrl


class CloneTestResponse(BaseModel):
    """Response returned after testing repository cloning."""

    status: str
    repository: str
    files_found: int
    cleanup: str