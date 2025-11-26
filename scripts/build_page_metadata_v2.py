"""Build page-level metadata for pre-split image datasets.

This script walks a set of known dataset directories where each file is a
single page or texture sample. It does not attempt to rotate or split pages
and assumes all input images are already oriented correctly.

Outputs a CSV containing per-image statistics and labels derived from the
parent dataset directory.
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Tuple

import cv2
import numpy as np

# Mapping of dataset labels to their root directories relative to the repo root.
DATASETS: Dict[str, Path] = {
    "block_font": Path("Block Letter Font"),
    "cursive_letters": Path("Block Letter Font") / "Curse of Letters",
    "cursive_samples": Path("Samples of Cursive"),
    "shapes": Path("Shapes"),
    "textures": Path("That's Texture"),
}

# Supported image extensions for processing.
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif"}


def iter_image_files() -> Iterator[Tuple[str, Path]]:
    """Yield (dataset_label, image_path) pairs for all known datasets.

    Non-existent dataset directories are reported and skipped. Image discovery is
    non-recursive; only immediate files within each dataset directory are
    considered.
    """

    for dataset_label, dataset_dir in DATASETS.items():
        print(f"Scanning dataset '{dataset_label}' at {dataset_dir}")
        if not dataset_dir.exists():
            print(f"Warning: dataset directory missing, skipping: {dataset_dir}")
            continue

        if not dataset_dir.is_dir():
            print(f"Warning: dataset path is not a directory, skipping: {dataset_dir}")
            continue

        for item in sorted(dataset_dir.iterdir()):
            if not item.is_file():
                continue
            if item.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            yield dataset_label, item


def _relative_to_repo(path: Path) -> str:
    """Return a POSIX string path relative to the current working directory."""

    try:
        rel_path = path.relative_to(Path.cwd())
    except ValueError:
        rel_path = path
    return rel_path.as_posix()


def _compute_ink_components(mask: np.ndarray) -> Tuple[int, float, float]:
    """Compute connected component stats from an ink mask.

    Excludes the background label (assumed to be 0). Returns a tuple of the
    number of components, average area, and maximum area.
    """

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    component_count = max(num_labels - 1, 0)

    if component_count == 0:
        return 0, 0.0, 0.0

    component_areas = stats[1:, cv2.CC_STAT_AREA]
    avg_area = float(component_areas.mean())
    max_area = float(component_areas.max())
    return component_count, avg_area, max_area


def compute_page_stats(dataset_label: str, img_path: Path) -> Optional[Dict[str, float]]:
    """Load an image and compute per-page statistics.

    Returns a dictionary of metrics matching the CSV columns or ``None`` if the
    file cannot be processed. Failures are reported to stdout without raising
    exceptions to allow processing to continue.
    """

    try:
        print(f"Processing [{dataset_label}] file: {_relative_to_repo(img_path)}")
        img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"Warning: failed to load image: {img_path}")
            return None

        height, width = img.shape
        aspect_ratio = float(width) / float(height) if height != 0 else 0.0

        img_norm = img.astype(np.float32) / 255.0
        mean_intensity = float(img_norm.mean())
        std_intensity = float(img_norm.std())

        blurred = cv2.GaussianBlur(img_norm, (5, 5), 0)
        blurred_uint8 = (blurred * 255).astype(np.uint8)

        _, binary_mask = cv2.threshold(
            blurred_uint8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        ink_mask = cv2.bitwise_not(binary_mask)

        total_pixels = float(height * width)
        ink_ratio = float(cv2.countNonZero(ink_mask)) / total_pixels if total_pixels else 0.0

        num_components, avg_component_area, max_component_area = _compute_ink_components(ink_mask)

        edges = cv2.Canny(blurred_uint8, 100, 200)
        edge_density = float(cv2.countNonZero(edges)) / total_pixels if total_pixels else 0.0

        heavy_blur = cv2.GaussianBlur(img_norm, (9, 9), 0)
        local_variance = float(np.mean((img_norm - heavy_blur) ** 2))

        return {
            "dataset_label": dataset_label,
            "filename": img_path.name,
            "relative_path": _relative_to_repo(img_path),
            "height": int(height),
            "width": int(width),
            "aspect_ratio": aspect_ratio,
            "mean_intensity": mean_intensity,
            "std_intensity": std_intensity,
            "ink_ratio": ink_ratio,
            "num_components": num_components,
            "avg_component_area": avg_component_area,
            "max_component_area": max_component_area,
            "edge_density": edge_density,
            "local_variance": local_variance,
        }
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: failed to process {img_path}: {exc}")
        return None


def build_metadata(output_csv: Path) -> None:
    """Process all datasets and write metadata to ``output_csv``.

    The output directory is created if it does not exist. Only successfully
    processed images are written to the CSV.
    """

    rows: List[Dict[str, float]] = []

    for dataset_label, img_path in iter_image_files():
        stats = compute_page_stats(dataset_label, img_path)
        if stats is not None:
            rows.append(stats)

    if not rows:
        print("No images processed; skipping CSV write.")
        return

    output_csv.parent.mkdir(parents=True, exist_ok=True)

    fieldnames: Sequence[str] = [
        "dataset_label",
        "filename",
        "relative_path",
        "height",
        "width",
        "aspect_ratio",
        "mean_intensity",
        "std_intensity",
        "ink_ratio",
        "num_components",
        "avg_component_area",
        "max_component_area",
        "edge_density",
        "local_variance",
    ]

    print(f"Writing metadata for {len(rows)} images to {output_csv}")
    with output_csv.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    """Parse command-line arguments."""

    parser = argparse.ArgumentParser(description="Build metadata for page images.")
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=Path("handwriting_data/metadata_v2.csv"),
        help="Path to save the output CSV (default: handwriting_data/metadata_v2.csv)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    """Entry point for the metadata builder."""

    args = parse_args(argv)
    build_metadata(args.output_csv)


if __name__ == "__main__":
    main(sys.argv[1:])
