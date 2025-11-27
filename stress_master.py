"""Run all stress scripts sequentially."""
from __future__ import annotations

import importlib
from typing import List

STRESS_MODULES = [
    "stress_env_activation",
    "stress_import_failures",
    "stress_directory_structure",
    "stress_prepare_pages",
    "stress_extract_block_glyph_candidates",
    "stress_build_block_font_dataset",
    "stress_build_page_metadata_v2",
    "stress_classify_pages",
]


def main() -> None:
    failures: List[str] = []
    for module_name in STRESS_MODULES:
        try:
            module = importlib.import_module(module_name)
            if hasattr(module, "main"):
                module.main()
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{module_name}: {exc}")
    if failures:
        print("STRESS TEST FAILED: see logs above")
        for failure in failures:
            print(f" - {failure}")
    else:
        print("STRESS TEST PASSED: environment is resilient")


if __name__ == "__main__":
    main()
