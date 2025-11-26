"""Build a normalized glyph dataset for the block/printed font.

The script expects candidate metadata from extract_block_glyph_candidates.py and
manages a label CSV that the user can edit to assign characters (including
punctuation). It then re-crops and normalizes the selected glyphs.
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np

BLOCK_FONT_DIR = Path("Block Letter Font")
TARGET_SIZE = 256
CANVAS_MARGIN = 2
RE_CROP_PADDING = 3
LABEL_HEADER = ["candidate_id", "char", "use_for_font", "source_page", "row_index", "col_index"]


def load_candidates(candidates_csv: Path) -> Dict[str, Dict[str, str]]:
    """Load candidate metadata into a dict keyed by candidate_id."""

    if not candidates_csv.exists():
        raise FileNotFoundError(f"Candidates CSV not found: {candidates_csv}")

    candidates: Dict[str, Dict[str, str]] = {}
    with candidates_csv.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get("candidate_id")
            if not cid:
                continue
            candidates[cid] = row
    return candidates


def ensure_label_csv(candidates: Dict[str, Dict[str, str]], labels_csv: Path) -> bool:
    """Create the label CSV if missing. Returns True if it already existed."""

    if labels_csv.exists():
        return True

    labels_csv.parent.mkdir(parents=True, exist_ok=True)
    with labels_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(LABEL_HEADER)
        for cid, row in candidates.items():
            writer.writerow(
                [
                    cid,
                    "",
                    "1",
                    row.get("source_page", ""),
                    row.get("row_index", ""),
                    row.get("col_index", ""),
                ]
            )
    print(
        f"Label file created at {labels_csv}. Please fill in the char column with the character for each candidate ID "
        "(including punctuation) and set use_for_font to 1 or 0. Then run this script again."
    )
    return False


def parse_labels(labels_csv: Path) -> Dict[str, Dict[str, str]]:
    """Read labels CSV into a dict keyed by candidate_id."""

    labels: Dict[str, Dict[str, str]] = {}
    with labels_csv.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get("candidate_id")
            if not cid:
                continue
            labels[cid] = row
    return labels


def safe_char_name(ch: str) -> str:
    """Map characters to filename-safe names."""

    if ch.isalnum():
        return ch

    mapping = {
        " ": "space",
        ".": "period",
        ",": "comma",
        "!": "exclamation",
        "?": "question",
        ":": "colon",
        ";": "semicolon",
        "'": "apostrophe",
        "’": "apostrophe",
        '"': "quote",
        "-": "hyphen",
        "_": "underscore",
        "(": "lparen",
        ")": "rparen",
    }
    if ch in mapping:
        return mapping[ch]
    return f"u{ord(ch):04X}"


def _is_truthy(val: str | None) -> bool:
    return str(val).strip().lower() in {"1", "true", "yes", "y", "t"}


def _crop_with_padding(img_gray: np.ndarray, bbox: Tuple[int, int, int, int], padding: int) -> np.ndarray:
    x, y, w, h = bbox
    img_h, img_w = img_gray.shape
    x0 = max(x - padding, 0)
    y0 = max(y - padding, 0)
    x1 = min(x + w + padding, img_w)
    y1 = min(y + h + padding, img_h)
    return img_gray[y0:y1, x0:x1]


def _trim_to_ink(crop: np.ndarray, margin: int = 1) -> np.ndarray:
    """Trim empty rows/cols around ink while keeping a small margin."""

    if crop.size == 0:
        return crop
    _, mask = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    ink = 255 - mask
    rows = np.where(ink.sum(axis=1) > 0)[0]
    cols = np.where(ink.sum(axis=0) > 0)[0]
    if len(rows) == 0 or len(cols) == 0:
        return crop
    y0 = max(int(rows.min()) - margin, 0)
    y1 = min(int(rows.max()) + margin + 1, crop.shape[0])
    x0 = max(int(cols.min()) - margin, 0)
    x1 = min(int(cols.max()) + margin + 1, crop.shape[1])
    return crop[y0:y1, x0:x1]


def _resize_to_canvas(crop: np.ndarray, size: int, margin: int) -> np.ndarray:
    if crop.size == 0:
        return np.zeros((size, size), dtype=np.uint8)

    h, w = crop.shape
    max_dim = max(h, w)
    if max_dim == 0:
        return np.zeros((size, size), dtype=np.uint8)

    target_inner = size - 2 * margin
    scale = min(1.0, target_inner / max_dim)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)

    canvas = np.zeros((size, size), dtype=np.uint8)
    x_offset = (size - new_w) // 2
    y_offset = (size - new_h) // 2
    canvas[y_offset : y_offset + new_h, x_offset : x_offset + new_w] = resized
    return canvas


def build_glyph_dataset(
    candidates: Dict[str, Dict[str, str]],
    labels: Dict[str, Dict[str, str]],
    out_dir: Path,
    block_font_dir: Path,
) -> None:
    """Create normalized glyph images based on labels and candidates."""

    out_dir.mkdir(parents=True, exist_ok=True)
    metadata_path = out_dir / "glyphs_block_metadata.csv"
    metadata_rows: List[List[str]] = []
    char_counters: Dict[str, int] = {}

    for cid, label_row in labels.items():
        char_val = (label_row.get("char") or "").strip()
        if not char_val:
            continue
        if not _is_truthy(label_row.get("use_for_font")):
            continue
        if len(char_val) > 1:
            print(f"Skipping {cid}: char must be a single character")
            continue

        candidate = candidates.get(cid)
        if not candidate:
            print(f"Warning: candidate {cid} not found in candidates CSV")
            continue

        page_name = candidate.get("source_page")
        if not page_name:
            print(f"Skipping {cid}: missing source_page in metadata")
            continue

        page_path = block_font_dir / page_name
        if not page_path.exists():
            print(f"Skipping {cid}: source page not found at {page_path}")
            continue

        img_gray = cv2.imread(str(page_path), cv2.IMREAD_GRAYSCALE)
        if img_gray is None:
            print(f"Skipping {cid}: unable to read {page_path}")
            continue

        bbox = (
            int(candidate.get("x", 0)),
            int(candidate.get("y", 0)),
            int(candidate.get("w", 0)),
            int(candidate.get("h", 0)),
        )
        crop = _crop_with_padding(img_gray, bbox, RE_CROP_PADDING)
        crop = _trim_to_ink(crop, margin=1)
        canvas = _resize_to_canvas(crop, TARGET_SIZE, CANVAS_MARGIN)

        safe_name = safe_char_name(char_val)
        count = char_counters.get(safe_name, 0) + 1
        char_counters[safe_name] = count
        filename = f"{safe_name}_{count:02d}.png"
        out_path = out_dir / filename

        cv2.imwrite(str(out_path), canvas)
        print(f"Saved glyph {filename} from {cid}")

        metadata_rows.append(
            [
                char_val,
                safe_name,
                filename,
                cid,
                page_name,
                candidate.get("row_index", ""),
                candidate.get("col_index", ""),
                candidate.get("x", ""),
                candidate.get("y", ""),
                candidate.get("w", ""),
                candidate.get("h", ""),
            ]
        )

    with metadata_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "char",
                "safe_char",
                "filename",
                "candidate_id",
                "source_page",
                "row_index",
                "col_index",
                "orig_x",
                "orig_y",
                "orig_w",
                "orig_h",
            ]
        )
        writer.writerows(metadata_rows)
    print(f"Normalized glyphs written to {out_dir}")
    print(f"Glyph metadata written to {metadata_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build normalized block font glyph dataset.")
    parser.add_argument(
        "--candidates-csv",
        type=Path,
        required=True,
        help="Path to the candidates metadata CSV.",
    )
    parser.add_argument(
        "--labels-csv",
        type=Path,
        required=True,
        help="Path to glyph_labels_block.csv (will be created if missing).",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        required=True,
        help="Directory to write normalized glyph images.",
    )
    args = parser.parse_args()

    candidates_csv: Path = args.candidates_csv
    labels_csv: Path = args.labels_csv
    out_dir: Path = args.out_dir

    candidates = load_candidates(candidates_csv)
    if not ensure_label_csv(candidates, labels_csv):
        return

    labels = parse_labels(labels_csv)
    build_glyph_dataset(candidates, labels, out_dir, BLOCK_FONT_DIR)


if __name__ == "__main__":
    main()
