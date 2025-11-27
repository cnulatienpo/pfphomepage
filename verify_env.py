import sys


def is_env_active() -> bool:
    # Common virtual environment indicators
    return sys.prefix != sys.base_prefix or hasattr(sys, "real_prefix") or bool(
        sys.environ.get("VIRTUAL_ENV") or sys.environ.get("CONDA_PREFIX")
    )


def main() -> None:
    print(f"sys.executable: {sys.executable}")
    print(f"sys.prefix: {sys.prefix}")
    print(f"sys.base_prefix: {sys.base_prefix}")

    active = is_env_active()
    print(f"env detected: {active}")

    if active:
        print("OK: env is active")
        sys.exit(0)
    else:
        print("ERROR: env is NOT active")
        sys.exit(1)


if __name__ == "__main__":
    main()
