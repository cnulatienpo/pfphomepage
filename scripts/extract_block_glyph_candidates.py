"""Extract glyph candidates from block-letter pages.

This script scans block/printed handwriting pages to find connected components
that may correspond to glyphs (letters, digits, punctuation). It saves cropped
candidate images and writes metadata describing their origin and geometry.
"""
from __future__ import annotations

from env_guard_snippet import ensure_env_active
ensure_env_active()
from import_guard_snippet import verify_required_imports
verify_required_imports()

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import cv2
import numpy as np

# Tunable constants
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}
GAUSSIAN_BLUR_KERNEL = (5, 5)
MORPH_KERNEL_SIZE = (3, 3)
MORPH_ITERATIONS = 1
MIN_AREA = 20
MIN_HEIGHT = 4
ROW_GAP_FACTOR = 1.6
MIN_ROW_GAP = 6
PADDING = 2


@dataclass
class Component:
    """Represents a connected component that may be a glyph candidate."""

    x: int
    y: int
    w: int
    h: int
    area: int
    cx: float
    cy: float
    row_index: int | None = None
    col_index: int | None = None

    def bbox(self) -> Tuple[int, int, int, int]:
        """Return the bounding box as (x, y, w, h)."""

        return self.x, self.y, self.w, self.h


@dataclass
class CandidateMetadata:
    """Metadata describing a saved glyph candidate."""

    candidate_id: str
    source_page: str
    source_page_index: int
    x: int
    y: int
    w: int
    h: int
    area: int
    row_index: int
    col_index: int
    img_width: int
    img_height: int

    def to_csv_row(self) -> List[str]:
        """Return the metadata as a list of strings for CSV writing."""

        return [
            self.candidate_id,
            self.source_page,
            str(self.source_page_index),
            str(self.x),
            str(self.y),
            str(self.w),
            str(self.h),
            str(self.area),
            str(self.row_index),
            str(self.col_index),
            str(self.img_width),
            str(self.img_height),
        ]


CSV_HEADER = [
    "candidate_id",
    "source_page",
    "source_page_index",
    "x",
    "y",
    "w",
    "h",
    "area",
    "row_index",
    "col_index",
    "img_width",
    "img_height",
]


def find_image_files(source_dir: Path) -> List[Path]:
    """Return sorted image files in the source directory (non-recursive)."""

    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    files = [
        p
        for p in source_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ]
    return sorted(files)


def load_and_binarize(img_path: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Load an image as grayscale and produce a binary ink mask.

    Returns a tuple of the grayscale image and the binary (ink=255) mask.
    """

    img_gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if img_gray is None:
        raise ValueError(f"Failed to load image: {img_path}")

    img_norm = img_gray.astype("float32") / 255.0
    blurred = cv2.GaussianBlur(img_norm, GAUSSIAN_BLUR_KERNEL, 0)
    _, thresh = cv2.threshold(
        (blurred * 255).astype("uint8"),
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )
    ink = 255 - thresh

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, MORPH_KERNEL_SIZE)
    ink_closed = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, kernel, iterations=MORPH_ITERATIONS)
    return img_gray, ink_closed


def _is_notebook_line(x: int, y: int, w: int, h: int, img_w: int, img_h: int) -> bool:
    """Heuristic to detect horizontal notebook lines."""

    return w > img_w * 0.7 and h < img_h * 0.05


def _is_border_artifact(x: int, y: int, w: int, h: int, img_w: int, img_h: int, area: int) -> bool:
    """Detect large shapes hugging the border that likely aren't glyphs."""

    hits_border = x == 0 or y == 0 or x + w >= img_w - 1 or y + h >= img_h - 1
    return hits_border and area > img_w * img_h * 0.05


def find_glyph_components(ink_binary: np.ndarray, img_shape: Tuple[int, int]) -> List[Component]:
    """Find glyph-like connected components from the ink mask."""

    img_h, img_w = img_shape
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        ink_binary, connectivity=8
    )

    components: List[Component] = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        cx, cy = centroids[i]

        if area < MIN_AREA:
            continue
        if h < MIN_HEIGHT:
            continue
        if _is_notebook_line(x, y, w, h, img_w, img_h):
            continue
        if _is_border_artifact(x, y, w, h, img_w, img_h, area):
            continue

        components.append(Component(x, y, w, h, int(area), float(cx), float(cy)))

    return components


def assign_rows_and_columns(components: List[Component]) -> List[Component]:
    """Assign row and column ordering to components based on position."""

    if not components:
        return []

    components_sorted = sorted(components, key=lambda c: c.y)
    heights = [c.h for c in components_sorted]
    median_height = float(np.median(heights)) if heights else 1.0
    row_gap = max(int(median_height * ROW_GAP_FACTOR), MIN_ROW_GAP)

    current_row_y = components_sorted[0].y
    row_index = 0
    for comp in components_sorted:
        if comp.y - current_row_y > row_gap:
            row_index += 1
            current_row_y = comp.y
        comp.row_index = row_index

    rows: Dict[int, List[Component]] = {}
    for comp in components_sorted:
        rows.setdefault(comp.row_index or 0, []).append(comp)

    ordered: List[Component] = []
    for r in sorted(rows.keys()):
        row_items = sorted(rows[r], key=lambda c: c.x)
        for col_idx, comp in enumerate(row_items):
            comp.col_index = col_idx
            ordered.append(comp)

    return ordered


def _format_candidate_id(page_index: int, row_index: int, col_index: int) -> str:
    return f"page{page_index:02d}_r{row_index:02d}_c{col_index:02d}"


def crop_and_save_candidates(
    components: Iterable[Component],
    img_gray: np.ndarray,
    out_dir: Path,
    page_index: int,
    source_page_name: str,
) -> List[CandidateMetadata]:
    """Crop candidate components and save them to disk.

    Returns metadata for each saved candidate.
    """

    out_dir.mkdir(parents=True, exist_ok=True)
    img_h, img_w = img_gray.shape
    metadata_rows: List[CandidateMetadata] = []

    for comp in components:
        if comp.row_index is None or comp.col_index is None:
            continue
        candidate_id = _format_candidate_id(page_index, comp.row_index, comp.col_index)

        x0 = max(comp.x - PADDING, 0)
        y0 = max(comp.y - PADDING, 0)
        x1 = min(comp.x + comp.w + PADDING, img_w)
        y1 = min(comp.y + comp.h + PADDING, img_h)
        glyph_crop = img_gray[y0:y1, x0:x1]

        filename = f"block_candidate_{candidate_id}.png"
        out_path = out_dir / filename
        cv2.imwrite(str(out_path), glyph_crop)
        print(f"Saved candidate {filename}")

        metadata_rows.append(
            CandidateMetadata(
                candidate_id=candidate_id,
                source_page=source_page_name,
                source_page_index=page_index,
                x=comp.x,
                y=comp.y,
                w=comp.w,
                h=comp.h,
                area=comp.area,
                row_index=comp.row_index,
                col_index=comp.col_index,
                img_width=img_w,
                img_height=img_h,
            )
        )

    return metadata_rows


def write_metadata_csv(metadata: List[CandidateMetadata], csv_path: Path) -> None:
    """Write candidate metadata to CSV."""

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(CSV_HEADER)
        for row in metadata:
            writer.writerow(row.to_csv_row())
    print(f"Metadata written to {csv_path}")


def process_page(img_path: Path, page_index: int, out_dir: Path) -> List[CandidateMetadata]:
    """Process a single page image and return metadata for saved candidates."""

    print(f"Processing {img_path.name} (page {page_index})")
    img_gray, ink_binary = load_and_binarize(img_path)
    components = find_glyph_components(ink_binary, img_gray.shape)
    ordered_components = assign_rows_and_columns(components)
    return crop_and_save_candidates(ordered_components, img_gray, out_dir, page_index, img_path.name)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract block glyph candidates from page images.")
    parser.add_argument("--source-dir", type=Path, required=True, help="Directory with block font page images.")
    parser.add_argument("--out-dir", type=Path, required=True, help="Directory to save candidate crops.")
    parser.add_argument(
        "--metadata-csv",
        type=Path,
        required=True,
        help="Path to write candidate metadata CSV.",
    )
    args = parser.parse_args()

    source_dir: Path = args.source_dir
    out_dir: Path = args.out_dir
    metadata_csv: Path = args.metadata_csv

    image_files = find_image_files(source_dir)
    if not image_files:
        raise SystemExit(f"No image files found in {source_dir}")

    all_metadata: List[CandidateMetadata] = []
    for page_index, img_path in enumerate(image_files):
        if img_path.is_dir():
            continue
        metadata_rows = process_page(img_path, page_index, out_dir)
        all_metadata.extend(metadata_rows)

    write_metadata_csv(all_metadata, metadata_csv)


if __name__ == "__main__":
    main()
