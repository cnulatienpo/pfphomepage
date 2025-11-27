"""Simulate import-guard failures for critical dependencies."""
from __future__ import annotations

import builtins
import io
import importlib
from contextlib import redirect_stdout
from dataclasses import dataclass
from typing import Dict, List, Set

from import_guard_snippet import verify_required_imports


@dataclass
class ImportScenario:
    name: str
    missing: Set[str]
    dummy_modules: Dict[str, object] | None = None
    expect_failure: bool = True


def run_scenario(scenario: ImportScenario) -> tuple[bool, str]:
    original_import = builtins.__import__
    output = io.StringIO()

    def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name in scenario.missing:
            raise ImportError(f"Simulated missing module: {name}")
        if scenario.dummy_modules and name in scenario.dummy_modules:
            return scenario.dummy_modules[name]
        return original_import(name, globals, locals, fromlist, level)

    try:
        builtins.__import__ = fake_import
        with redirect_stdout(output):
            try:
                verify_required_imports()
                return not scenario.expect_failure, output.getvalue()
            except SystemExit:
                return scenario.expect_failure, output.getvalue()
    finally:
        builtins.__import__ = original_import


def main() -> None:
    dummy_cv2 = type("DummyCV2", (), {})()
    scenarios: List[ImportScenario] = [
        ImportScenario("cv2 missing", {"cv2"}),
        ImportScenario("numpy missing", {"numpy"}),
        ImportScenario("Pillow missing", {"PIL"}),
        ImportScenario("All three missing", {"cv2", "PIL", "numpy"}),
        ImportScenario("All installed, order scrambled", set(), expect_failure=False),
        ImportScenario(
            "cv2 missing __version__", set(), dummy_modules={"cv2": dummy_cv2}, expect_failure=False
        ),
    ]

    for scenario in scenarios:
        passed, output = run_scenario(scenario)
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {scenario.name}")
        if output.strip():
            print(output.strip())
        print("-" * 60)


if __name__ == "__main__":
    main()
