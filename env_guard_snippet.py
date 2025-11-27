"""Reusable environment guard to enforce use of the repo virtualenv."""
from __future__ import annotations

import sys

EXPECTED_SEGMENT = "env/bin/python"


def ensure_env_active() -> None:
    """Exit if the current interpreter is not the project virtualenv."""

    if EXPECTED_SEGMENT not in sys.executable:
        print("ERROR: Activate environment first:  source env/bin/activate")
        raise SystemExit(1)


if __name__ == "__main__":
    ensure_env_active()
