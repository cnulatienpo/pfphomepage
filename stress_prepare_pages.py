"""Stress test scripts/prepare_pages.py under hostile conditions."""
from __future__ import annotations

from pathlib import Path

from stress_pipeline_base import ScenarioResult, run_scenarios

SCRIPT_PATH = Path("scripts/prepare_pages.py")


def failure_stub(msg: str) -> str:
    return f"def convert_from_path(*args, **kwargs):\n    raise Exception('{msg}')\n"


def guard_failure_stub(pkg: str) -> str:
    return (
        "def verify_required_imports():\n"
        f"    raise SystemExit('Missing package: {pkg}')\n"
    )


def main() -> None:
    scenarios = [
        (
            "Missing directories",
            True,
            {"pdf2image": failure_stub("Missing input directory")},
            True,
            None,
            None,
        ),
        (
            "Wrong permissions",
            True,
            {"pdf2image": failure_stub("Permission denied")},
            True,
            None,
            None,
        ),
        (
            "Incorrect file formats",
            True,
            {"pdf2image": failure_stub("Incorrect file format")},
            True,
            None,
            None,
        ),
        (
            "Empty files",
            True,
            {"pdf2image": failure_stub("Empty PDF")},
            True,
            None,
            None,
        ),
        (
            "Corrupted images",
            True,
            {"pdf2image": failure_stub("Corrupted image data")},
            True,
            None,
            None,
        ),
        (
            "Unexpected extensions",
            True,
            {"pdf2image": failure_stub("Unexpected extension")},
            True,
            None,
            None,
        ),
        (
            "Missing metadata",
            True,
            {"pdf2image": failure_stub("Missing metadata")},
            True,
            None,
            None,
        ),
        (
            "Missing output folders",
            True,
            {"pdf2image": failure_stub("Output path missing")},
            True,
            None,
            None,
        ),
        (
            "cv2 import failure",
            True,
            {"import_guard_snippet": guard_failure_stub("opencv-python-headless")},
            True,
            None,
            None,
        ),
        (
            "PIL import failure",
            True,
            {"import_guard_snippet": guard_failure_stub("pillow")},
            True,
            None,
            None,
        ),
        (
            "numpy import failure",
            True,
            {"import_guard_snippet": guard_failure_stub("numpy")},
            True,
            None,
            None,
        ),
        (
            "sys.executable mismatch",
            False,
            None,
            True,
            None,
            None,
        ),
        (
            "Interrupted execution",
            True,
            {"pdf2image": "def convert_from_path(*args, **kwargs):\n    raise KeyboardInterrupt('Simulated interrupt')\n"},
            True,
            None,
            None,
        ),
        (
            "Exceptions inside main()",
            True,
            {"pdf2image": failure_stub("Unhandled exception in main")},
            True,
            None,
            None,
        ),
    ]

    for result in run_scenarios(SCRIPT_PATH, scenarios):
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.name}")
        if result.output.strip():
            print(result.output.strip())
        print("-" * 60)


if __name__ == "__main__":
    main()
