"""
File utilities for GrayZoneBench

Helper functions for file I/O and directory management.
"""

from datetime import datetime, timezone
from pathlib import Path


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)