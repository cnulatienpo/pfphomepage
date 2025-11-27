"""Import guard to ensure required dependencies are available before running a script."""
from __future__ import annotations

import sys

REQUIRED = {
    "cv2": "opencv-python-headless",
    "PIL": "pillow",
    "numpy": "numpy",
}

missing = []
for module_name, package_name in REQUIRED.items():
    try:
        __import__(module_name)
    except ImportError:
        missing.append((module_name, package_name))

if missing:
    sys.stderr.write("Missing required dependencies:\n")
    for module_name, package_name in missing:
        sys.stderr.write(f"- Import '{module_name}' failed: install with 'pip install {package_name}'\n")
    sys.exit(1)
