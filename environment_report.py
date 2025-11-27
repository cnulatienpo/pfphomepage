import importlib
from typing import List, Tuple

MODULES_TO_IMPORT: List[Tuple[str, str]] = [
    ("env_guard_snippet", "env guard snippet"),
    ("import_guard_snippet", "import guard snippet"),
    ("scripts.prepare_pages", "prepare_pages"),
    ("scripts.extract_block_glyph_candidates", "extract_block_glyph_candidates"),
    ("scripts.build_block_font_dataset", "build_block_font_dataset"),
    ("scripts.build_page_metadata_v2", "build_page_metadata_v2"),
    ("scripts.classify_pages", "classify_pages"),
    ("verify_env", "verify_env"),
    ("verify_imports", "verify_imports"),
    ("verify_directories", "verify_directories"),
    ("test_prepare_pages", "test_prepare_pages"),
    ("test_extract_block_glyph_candidates", "test_extract_block_glyph_candidates"),
    ("test_build_block_font_dataset", "test_build_block_font_dataset"),
    ("test_build_page_metadata_v2", "test_build_page_metadata_v2"),
    ("test_classify_pages", "test_classify_pages"),
]


def main() -> None:
    success = True
    for module_name, label in MODULES_TO_IMPORT:
        try:
            importlib.import_module(module_name)
        except Exception as exc:  # noqa: BLE001 - report any import failure
            success = False
            print(f"FAILED to import {label}: {exc}")
        else:
            print(f"Imported {label}")

    if success:
        print("Environment Verified")
    else:
        print("Environment NOT Verified")


if __name__ == "__main__":
    main()
