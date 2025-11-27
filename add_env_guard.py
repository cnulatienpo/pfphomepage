"""Runtime guard ensuring scripts use the repository virtual environment."""
from __future__ import annotations

import sys
from pathlib import Path


def _find_env_python(current: Path) -> Path:
    for parent in [current, *current.parents]:
        candidate = parent / "env" / "bin" / "python"
        if candidate.exists():
            return candidate.resolve()
    return (current / "env" / "bin" / "python").resolve()


def ensure_env_active() -> None:
    expected_python = _find_env_python(Path(__file__).resolve().parent)
    active_python = Path(sys.executable).resolve()
    if active_python != expected_python:
        sys.stderr.write(
            "This script must run inside the project's env virtual environment.\n"
        )
        sys.stderr.write("Run: source env/bin/activate\n")
        sys.exit(1)


ensure_env_active()
