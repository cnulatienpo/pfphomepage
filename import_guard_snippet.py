"""Reusable import guard to ensure required packages are available."""
from __future__ import annotations

from typing import Tuple


def _fail(package: str) -> None:
    print(f"Missing package: {package}")
    print("Install it inside the project environment:")
    print("  source env/bin/activate")
    print(f"  pip install {package}")
    raise SystemExit(1)


def _check_import(module_import: Tuple[str, str]) -> None:
    module_name, package_name = module_import
    try:
        __import__(module_name)
    except ImportError:
        _fail(package_name)


def verify_required_imports() -> None:
    """Ensure cv2, Pillow, and numpy are importable."""

    required_modules = (
        ("cv2", "opencv-python-headless"),
        ("PIL", "pillow"),
        ("numpy", "numpy"),
    )
    for module_name, package_name in required_modules:
        _check_import((module_name, package_name))


if __name__ == "__main__":
    verify_required_imports()
