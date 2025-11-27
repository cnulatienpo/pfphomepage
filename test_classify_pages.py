import importlib
import sys

TARGET_MODULE = "scripts.classify_pages"
TARGET_LABEL = "classify_pages.py"


def main() -> None:
    try:
        module = importlib.import_module(TARGET_MODULE)
    except ImportError as exc:
        print(f"ImportError: failed to import {TARGET_LABEL}: {exc}")
        print("Ensure all dependencies are installed and the module path is correct.")
        sys.exit(1)

    try:
        module.main()
    except (ImportError, FileNotFoundError, OSError, RuntimeError) as exc:
        print(f"{type(exc).__name__}: {exc}")
        print("The script may be missing dependencies or required folders/files.")
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001 - need to report unexpected failures
        print(f"Unexpected error running {TARGET_LABEL}: {exc}")
        sys.exit(1)

    print("OK: classify_pages.py ran without crashing")


if __name__ == "__main__":
    main()
