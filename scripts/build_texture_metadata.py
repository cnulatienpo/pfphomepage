import argparse
import csv
import importlib.util
import sys
from pathlib import Path

REQUIRED_PYTHON = "/workspaces/pfphomepage/env/bin/python"
REQUIRED_MODULES = ["cv2", "numpy", "PIL"]


if sys.executable != REQUIRED_PYTHON:
    print(f"This script must be run with {REQUIRED_PYTHON}. Current interpreter: {sys.executable}")
    sys.exit(1)

missing = [mod for mod in REQUIRED_MODULES if importlib.util.find_spec(mod) is None]
if missing:
    print("Run inside env: python -m pip install opencv-python-headless pillow numpy")
    sys.exit(1)

import cv2  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402  # pylint: disable=unused-import

DEFAULT_SHAPES_DIR = Path("/workspaces/pfphomepage/shapes")
DEFAULT_TEXTURES_DIR = Path("/workspaces/pfphomepage/thats texture")
DEFAULT_OUTPUT_CSV = Path("/workspaces/pfphomepage/assets/texture_metadata.csv")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build texture metadata from shapes and texture scans.")
    parser.add_argument("--shapes-dir", type=Path, default=DEFAULT_SHAPES_DIR, help="Directory containing shape scans.")
    parser.add_argument("--textures-dir", type=Path, default=DEFAULT_TEXTURES_DIR, help="Directory containing texture scans.")
    parser.add_argument("--output-csv", type=Path, default=DEFAULT_OUTPUT_CSV, help="Output CSV for metadata.")
    return parser.parse_args()


def is_image_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS


def compute_metrics(image_path: Path) -> dict:
    img_gray = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img_gray is None:
        raise ValueError(f"Failed to read image: {image_path}")

    height, width = img_gray.shape
    aspect_ratio = width / height if height != 0 else 0.0

    img_norm = img_gray.astype(np.float32) / 255.0

    mean_intensity = float(np.mean(img_norm))
    std_intensity = float(np.std(img_norm))
    contrast = float(np.max(img_norm) - np.min(img_norm))

    laplacian = cv2.Laplacian(img_norm, cv2.CV_64F)
    sharpness = float(np.var(laplacian))

    blurred = cv2.GaussianBlur(img_norm, (9, 9), 0)
    local_variance = float(np.mean((img_norm - blurred) ** 2))

    edges = cv2.Canny((img_norm * 255).astype(np.uint8), 100, 200)
    edge_density = float(np.count_nonzero(edges) / edges.size)

    small_blur = cv2.GaussianBlur(img_norm, (5, 5), 0)
    small_scale_detail = float(np.var(cv2.Laplacian(small_blur, cv2.CV_64F)))

    large_blur = cv2.GaussianBlur(img_norm, (15, 15), 0)
    large_scale_detail = float(np.var(cv2.Laplacian(large_blur, cv2.CV_64F)))

    return {
        "height": height,
        "width": width,
        "aspect_ratio": aspect_ratio,
        "mean_intensity": mean_intensity,
        "std_intensity": std_intensity,
        "contrast": contrast,
        "sharpness": sharpness,
        "local_variance": local_variance,
        "edge_density": edge_density,
        "small_scale_detail": small_scale_detail,
        "large_scale_detail": large_scale_detail,
    }


def gather_image_files(directory: Path) -> list[Path]:
    if not directory.exists():
        print(f"Directory does not exist: {directory}")
        return []
    print(f"Scanning directory: {directory}")
    return [path for path in directory.iterdir() if is_image_file(path)]


def write_csv(rows: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "dataset_label",
        "filename",
        "full_path",
        "height",
        "width",
        "aspect_ratio",
        "mean_intensity",
        "std_intensity",
        "contrast",
        "sharpness",
        "local_variance",
        "edge_density",
        "small_scale_detail",
        "large_scale_detail",
    ]
    with output_path.open("w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    print(f"Metadata written to {output_path}")


def process_directory(directory: Path, label: str) -> list[dict]:
    rows = []
    for image_path in gather_image_files(directory):
        print(f"Processing {image_path}")
        try:
            metrics = compute_metrics(image_path)
        except Exception as exc:  # noqa: BLE001
            print(f"Skipping {image_path}: {exc}")
            continue

        row = {
            "dataset_label": label,
            "filename": image_path.name,
            "full_path": str(image_path),
            **metrics,
        }
        rows.append(row)
    return rows


def main() -> None:
    args = parse_args()

    rows = []
    rows.extend(process_directory(args.shapes_dir, "shapes"))
    rows.extend(process_directory(args.textures_dir, "thats_texture"))

    write_csv(rows, args.output_csv)


if __name__ == "__main__":
    main()
