"""Simulate environment activation failures against env_guard_snippet."""
from __future__ import annotations

import io
import os
import sys
from contextlib import redirect_stdout
from dataclasses import dataclass
from typing import Callable, List

GUARD_MESSAGE = "ERROR: Activate environment first:  source env/bin/activate"


@dataclass
class EnvScenario:
    name: str
    executable: str
    virtual_env: str | None = None
    pythonpath: str | None = None


def run_guard(executable: str, virtual_env: str | None, pythonpath: str | None) -> tuple[bool, str]:
    """Run ensure_env_active with injected interpreter state."""

    from env_guard_snippet import ensure_env_active

    original_exec = sys.executable
    original_env = os.environ.copy()
    buf = io.StringIO()
    try:
        sys.executable = executable
        if virtual_env is None:
            os.environ.pop("VIRTUAL_ENV", None)
        else:
            os.environ["VIRTUAL_ENV"] = virtual_env
        if pythonpath is None:
            os.environ.pop("PYTHONPATH", None)
        else:
            os.environ["PYTHONPATH"] = pythonpath

        with redirect_stdout(buf):
            try:
                ensure_env_active()
            except SystemExit as exc:  # guard caught the issue
                return exc.code != 0 and GUARD_MESSAGE in buf.getvalue(), buf.getvalue()
    finally:
        sys.executable = original_exec
        os.environ.clear()
        os.environ.update(original_env)
    return False, buf.getvalue()


def main() -> None:
    scenarios: List[EnvScenario] = [
        EnvScenario("Forgot to activate env", "/usr/bin/python3"),
        EnvScenario("Activated wrong interpreter", "/opt/other/bin/python"),
        EnvScenario("Python path polluted", "/usr/bin/python3", pythonpath="/tmp/bad"),
        EnvScenario("Env folder corrupted", "/usr/local/bin/python"),
        EnvScenario("Env missing pip", "/bin/python3"),
        EnvScenario("sys.executable mismatch", "/tmp/python"),
        EnvScenario("VIRTUAL_ENV wrong", "/tmp/another_env/bin/python", virtual_env="/tmp/another_env"),
    ]

    for scenario in scenarios:
        detected, output = run_guard(
            executable=scenario.executable,
            virtual_env=scenario.virtual_env,
            pythonpath=scenario.pythonpath,
        )
        status = "PASS" if detected else "FAIL"
        print(f"[{status}] {scenario.name}")
        if output.strip():
            print(output.strip())
        if not detected:
            print("Guard did not trigger as expected.")
        print("-" * 60)


if __name__ == "__main__":
    main()
