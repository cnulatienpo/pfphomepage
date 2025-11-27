"""Simulate directory validation failures using verify_directories.py."""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import List, Tuple

EXPECTED = [
    "block letters",
    "block letter font",
    "cursive letters",
    "samples of cursive",
    "shapes",
    "thats texture",
]


def run_verifier(base: Path) -> Tuple[int, str]:
    proc = subprocess.run(
        [sys.executable, "verify_directories.py"],
        cwd=str(base),
        capture_output=True,
        text=True,
    )
    output = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, output


def make_dirs(base: Path, names: List[str]) -> None:
    for name in names:
        path = base / name
        path.mkdir(parents=True, exist_ok=True)


def scenario_missing(base: Path) -> Tuple[int, str]:
    return run_verifier(base)


def scenario_mis_capitalized(base: Path) -> Tuple[int, str]:
    make_dirs(base, [name.title() for name in EXPECTED])
    return run_verifier(base)


def scenario_unreadable(base: Path) -> Tuple[int, str]:
    make_dirs(base, EXPECTED)
    locked = base / EXPECTED[0]
    locked.chmod(0o000)
    try:
        return run_verifier(base)
    finally:
        locked.chmod(0o755)


def scenario_empty(base: Path) -> Tuple[int, str]:
    make_dirs(base, EXPECTED)
    return run_verifier(base)


def scenario_file_instead(base: Path) -> Tuple[int, str]:
    make_dirs(base, EXPECTED[1:])
    (base / EXPECTED[0]).write_text("not a dir", encoding="utf-8")
    return run_verifier(base)


def scenario_missing_one(base: Path) -> Tuple[int, str]:
    make_dirs(base, EXPECTED[:-1])
    return run_verifier(base)


def scenario_all_missing(base: Path) -> Tuple[int, str]:
    return run_verifier(base)


def evaluate(name: str, result: Tuple[int, str], expect_failure: bool) -> None:
    code, output = result
    passed = (code != 0) if expect_failure else (code == 0)
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}")
    print(output.strip())
    print("-" * 60)


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        tests = [
            ("Directory missing entirely", scenario_missing, True),
            ("Directory present but mis-capitalized", scenario_mis_capitalized, True),
            ("Directory present but unreadable", scenario_unreadable, True),
            ("Directory present but empty", scenario_empty, False),
            ("Directory replaced with a file", scenario_file_instead, True),
            ("All directories present except thats texture", scenario_missing_one, True),
            ("All directories missing", scenario_all_missing, True),
        ]

        for name, func, expect_fail in tests:
            result = func(base)
            evaluate(name, result, expect_fail)


if __name__ == "__main__":
    main()
