"""Utility functions for securely cloning and cleaning repositories."""

import logging
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from git import GitCommandError, Repo


logger = logging.getLogger(__name__)

ALLOWED_GITHUB_HOSTS = {"github.com", "www.github.com"}


def validate_github_url(repo_url: str) -> str:
    """Validate and normalize a public GitHub repository URL."""

    parsed = urlparse(repo_url)

    if parsed.scheme != "https":
        raise ValueError("Only HTTPS GitHub URLs are allowed.")

    if parsed.hostname not in ALLOWED_GITHUB_HOSTS:
        raise ValueError("Only GitHub repository URLs are allowed.")

    parts = [part for part in parsed.path.split("/") if part]

    if len(parts) != 2:
        raise ValueError(
            "URL must have the format https://github.com/owner/repository"
        )

    owner, repository = parts

    if owner in {".", ".."} or repository in {".", ".."}:
        raise ValueError("Invalid repository path.")

    if repository.endswith(".git"):
        repository = repository[:-4]

    if not owner or not repository:
        raise ValueError("Invalid GitHub repository URL.")

    return f"https://github.com/{owner}/{repository}.git"


def clone_repo(repo_url: str) -> str:
    """Clone a validated public GitHub repository into a temporary directory."""

    validated_url = validate_github_url(repo_url)

    temp_directory = tempfile.mkdtemp(prefix="vulnscan_")

    try:
        Repo.clone_from(
            validated_url,
            temp_directory,
            depth=1,
            single_branch=True,
        )

        logger.info("Repository cloned successfully.")

        return temp_directory

    except GitCommandError as exc:
        cleanup_repo(temp_directory)
        logger.error("Repository cloning failed: %s", exc)
        raise RuntimeError("Unable to clone repository.") from exc


def cleanup_repo(local_path: str) -> None:
    """Delete a temporary cloned repository."""

    path = Path(local_path)

    if path.exists():
        shutil.rmtree(path, ignore_errors=True)
        logger.info("Temporary repository deleted.")


def count_repository_files(local_path: str) -> int:
    """Count files contained in a cloned repository."""

    path = Path(local_path)

    return sum(
        1
        for item in path.rglob("*")
        if item.is_file() and ".git" not in item.parts
    )