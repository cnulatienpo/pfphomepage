"""Stress test scripts/build_page_metadata_v2.py."""
from __future__ import annotations

from pathlib import Path

from stress_pipeline_base import run_scenarios

SCRIPT_PATH = Path("scripts/build_page_metadata_v2.py")


def cv2_stub(msg: str) -> str:
    return f"raise RuntimeError('{msg}')\n"


def guard_failure_stub(pkg: str) -> str:
    return (
        "def verify_required_imports():\n"
        f"    raise SystemExit('Missing package: {pkg}')\n"
    )


def main() -> None:
    scenarios = [
        ("Missing directories", True, {"cv2": cv2_stub("Missing source directory")}, True, None, None),
        ("Wrong permissions", True, {"cv2": cv2_stub("Permission denied")}, True, None, None),
        ("Incorrect file formats", True, {"cv2": cv2_stub("Bad file format")}, True, None, None),
        ("Empty files", True, {"cv2": cv2_stub("Empty file")}, True, None, None),
        ("Corrupted images", True, {"cv2": cv2_stub("Corrupted image data")}, True, None, None),
        (
            "Unexpected extensions",
            True,
            {"cv2": cv2_stub("Unexpected extension encountered")},
            True,
            None,
            None,
        ),
        ("Missing metadata", True, {"cv2": cv2_stub("Missing metadata")}, True, None, None),
        ("Missing output folders", True, {"cv2": cv2_stub("Output folder missing")}, True, None, None),
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
        ("sys.executable mismatch", False, None, True, None, None),
        (
            "Interrupted execution",
            True,
            {"cv2": "raise KeyboardInterrupt('Simulated interrupt')\n"},
            True,
            None,
            None,
        ),
        (
            "Exceptions inside main()",
            True,
            {"cv2": cv2_stub("Unhandled exception in main")},
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
