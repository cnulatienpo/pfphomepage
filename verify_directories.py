import os
from pathlib import Path
import sys

EXPECTED_DIRECTORIES = [
    "block letters",
    "block letter font",
    "cursive letters",
    "samples of cursive",
    "shapes",
    "thats texture",
]


def check_directory(name: str) -> bool:
    path = Path(name)
    if not path.is_dir():
        print(f"MISSING: {name}")
        return False
    if os.access(path, os.R_OK):
        print(f"FOUND: {name}")
        return True
    print(f"MISSING: {name} (not readable)")
    return False


def main() -> None:
    results = [check_directory(name) for name in EXPECTED_DIRECTORIES]
    if all(results):
        print("OK: directory structure valid")
        sys.exit(0)
    print("ERROR: directory structure incomplete")
    sys.exit(1)


if __name__ == "__main__":
    main()
