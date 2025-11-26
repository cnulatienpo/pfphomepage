"""Heuristic classifier for handwriting page images.

Given PNG pages already rotated upright, this script computes per-page metrics,
guesses a coarse label (print, cursive, or textures), copies the images into
label folders, and writes a CSV of all metrics for later inspection.
"""
from __future__ import annotations

import argparse
import csv
import shutil
from pathlib import Path
from typing import Dict, Iterable

import cv2
import numpy as np

# Thresholds for labeling heuristics
INK_TEXTURE_MAX = 0.01
COMP_TEXTURE_MAX = 10
INK_CURSIVE_MIN = 0.05
COMP_CURSIVE_MIN = 200
AVG_AREA_CURSIVE_MAX = 500.0
INK_PRINT_MIN = 0.01
INK_PRINT_MAX = 0.08
COMP_PRINT_MIN = 10
COMP_PRINT_MAX = 250

LABELS = ("print", "cursive", "textures")


def iter_pngs(pages_dir: Path) -> Iterable[Path]:
    """Yield PNG files directly under ``pages_dir`` sorted by name."""
    return sorted(path for path in pages_dir.iterdir() if path.suffix.lower() == ".png")


def compute_page_stats(img_path: Path) -> Dict[str, float | int | str]:
    """Compute structural and texture metrics for a single page image.

    Assumes the image is already rotated upright. Images are loaded in grayscale
    to simplify downstream processing.
    """
    gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if gray is None:
        raise ValueError(f"Could not load image: {img_path}")

    height, width = gray.shape
    total_pixels = float(height * width)
    gray_norm = gray.astype(np.float32) / 255.0

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    inverted = cv2.bitwise_not(binary)

    ink_ratio = float(np.count_nonzero(inverted) / total_pixels)

    num_labels, stats, _, _ = cv2.connectedComponentsWithStats(inverted, connectivity=8)
    component_areas = stats[1:, cv2.CC_STAT_AREA]
    num_components = int(num_labels - 1)
    avg_component_area = float(component_areas.mean()) if component_areas.size else 0.0
    max_component_area = float(component_areas.max()) if component_areas.size else 0.0

    edges = cv2.Canny(blurred, 50, 150)
    edge_density = float(np.count_nonzero(edges) / total_pixels)

    blurred_norm = cv2.GaussianBlur(gray_norm, (7, 7), 0)
    local_variance = float(np.mean((gray_norm - blurred_norm) ** 2))

    return {
        "filename": img_path.name,
        "height": height,
        "width": width,
        "ink_ratio": ink_ratio,
        "num_components": num_components,
        "avg_component_area": avg_component_area,
        "max_component_area": max_component_area,
        "edge_density": edge_density,
        "local_variance": local_variance,
    }


def guess_label(stats: Dict[str, float | int | str]) -> str:
    """Predict a coarse label for a page based on heuristic thresholds."""
    ink_ratio = float(stats["ink_ratio"])
    num_components = float(stats["num_components"])
    avg_component_area = float(stats["avg_component_area"])

    if ink_ratio < INK_TEXTURE_MAX or num_components < COMP_TEXTURE_MAX:
        return "textures"

    if (
        ink_ratio > INK_CURSIVE_MIN
        and num_components > COMP_CURSIVE_MIN
        and avg_component_area < AVG_AREA_CURSIVE_MAX
    ):
        return "cursive"

    if (
        INK_PRINT_MIN <= ink_ratio <= INK_PRINT_MAX
        and COMP_PRINT_MIN <= num_components <= COMP_PRINT_MAX
    ):
        return "print"

    return "textures"


def classify_pages(pages_dir: Path, out_root: Path, metadata_csv: Path) -> None:
    """Compute metrics, label pages, copy files, and write metadata CSV."""
    png_files = list(iter_pngs(pages_dir))
    if not png_files:
        print(f"No PNG pages found in {pages_dir.resolve()}")
        return

    label_dirs = {label: out_root / label for label in LABELS}
    for directory in label_dirs.values():
        directory.mkdir(parents=True, exist_ok=True)

    records: list[Dict[str, float | int | str]] = []

    for img_path in png_files:
        print(f"Analyzing {img_path.name}...")
        try:
            stats = compute_page_stats(img_path)
        except Exception as exc:  # pragma: no cover - defensive logging
            print(f"  !! failed to analyze {img_path.name}: {exc}")
            continue

        label = guess_label(stats)
        print(f"  -> guessed label: {label}")

        dest_path = label_dirs[label] / img_path.name
        try:
            shutil.copy2(img_path, dest_path)
        except Exception as exc:  # pragma: no cover - defensive logging
            print(f"  !! failed to copy {img_path.name} to {dest_path}: {exc}")
        else:
            print(f"  -> copied to {dest_path}")

        record = {**stats, "label": label}
        records.append(record)

    metadata_csv.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "filename",
        "label",
        "height",
        "width",
        "ink_ratio",
        "num_components",
        "avg_component_area",
        "max_component_area",
        "edge_density",
        "local_variance",
    ]

    with metadata_csv.open("w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(record)

    print(f"Wrote metadata to {metadata_csv}")


def main() -> None:
    """Parse CLI arguments and run classification."""
    parser = argparse.ArgumentParser(description="Classify handwriting page images.")
    parser.add_argument("pages_dir", type=Path, help="Directory containing PNG pages")
    parser.add_argument(
        "output_root",
        type=Path,
        help="Directory where label subfolders (print/cursive/textures) will be created",
    )
    parser.add_argument(
        "metadata_csv", type=Path, help="Path to write the per-page metadata CSV"
    )

    args = parser.parse_args()
    classify_pages(args.pages_dir, args.output_root, args.metadata_csv)


if __name__ == "__main__":
    main()
