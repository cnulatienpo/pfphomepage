import sys


def main() -> None:
    failed = []
    for module in ("cv2", "PIL", "numpy"):
        try:
            __import__(module)
        except ImportError:
            failed.append(module)
    if failed:
        print("ERROR: failed to import " + ", ".join(failed))
        sys.exit(1)
    print("OK: all imports succeeded")


if __name__ == "__main__":
    main()
