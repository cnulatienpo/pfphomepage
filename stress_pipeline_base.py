"""Common helpers for pipeline stress scripts."""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Tuple


@dataclass
class ScenarioResult:
    name: str
    passed: bool
    details: str
    output: str = ""


@contextmanager
def stubbed_environment(
    include_guard_stubs: bool = True,
    additional_stubs: Dict[str, str] | None = None,
    cwd: Path | None = None,
    extra_env: Dict[str, str] | None = None,
):
    """Yield an environment and working directory with optional stub modules."""

    with tempfile.TemporaryDirectory() as tmp:
        stub_dir = Path(tmp)
        if include_guard_stubs:
            (stub_dir / "env_guard_snippet.py").write_text(
                "def ensure_env_active():\n    return None\n",
                encoding="utf-8",
            )
            (stub_dir / "import_guard_snippet.py").write_text(
                "def verify_required_imports():\n    return None\n",
                encoding="utf-8",
            )
        for mod_name, source in (additional_stubs or {}).items():
            (stub_dir / f"{mod_name}.py").write_text(source, encoding="utf-8")

        env = os.environ.copy()
        env["PYTHONPATH"] = f"{stub_dir}{os.pathsep}{env.get('PYTHONPATH', '')}"
        if extra_env:
            env.update(extra_env)
        yield env, cwd or Path.cwd()


def run_script(
    script_path: Path,
    include_guard_stubs: bool = True,
    additional_stubs: Dict[str, str] | None = None,
    cwd: Path | None = None,
    extra_env: Dict[str, str] | None = None,
) -> Tuple[int, str]:
    """Execute a script in a subprocess with optional stubs and return status/output."""

    with stubbed_environment(include_guard_stubs, additional_stubs, cwd, extra_env) as (env, workdir):
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            env=env,
            cwd=str(workdir),
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, output


def evaluate(result: Tuple[int, str], expect_failure: bool) -> Tuple[bool, str]:
    code, output = result
    if expect_failure:
        return (code != 0 or "ERROR" in output or "Missing" in output), output
    return code == 0, output


def run_scenarios(
    script_path: Path,
    scenarios: Iterable[Tuple[str, bool, Dict[str, str] | None, bool, Path | None, Dict[str, str] | None]],
) -> Iterable[ScenarioResult]:
    """Run multiple scenarios and yield results."""

    for name, include_guard_stubs, stubs, expect_failure, cwd, extra_env in scenarios:
        code, output = run_script(
            script_path,
            include_guard_stubs=include_guard_stubs,
            additional_stubs=stubs,
            cwd=cwd,
            extra_env=extra_env,
        )
        passed, _ = evaluate((code, output), expect_failure)
        details = "FAIL" if not passed else "PASS"
        yield ScenarioResult(name=name, passed=passed, details=details, output=output)
