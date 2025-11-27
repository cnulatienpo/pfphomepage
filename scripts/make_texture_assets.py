import argparse
import csv
import importlib.util
import sys
from pathlib import Path
from typing import Dict, List

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

# Classification thresholds and asset sizing
TARGET_SIZE = 1024
DEPTH_LARGE_DETAIL_MIN = 0.0005
DEPTH_CONTRAST_MIN = 0.1
DEPTH_SHARPNESS_MAX = 0.01

SCALE_SHARPNESS_MIN = 0.005
SCALE_EDGE_DENSITY_MIN = 0.02
SCALE_LOCAL_VARIANCE_MIN = 0.001
SCALE_SMALL_DETAIL_MIN = 0.0005

CONTRAST_STRETCH = True
DEFAULT_METADATA_CSV = Path("/workspaces/pfphomepage/assets/texture_metadata.csv")
DEFAULT_ASSETS_ROOT = Path("/workspaces/pfphomepage/assets/textures")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create texture assets from metadata CSV.")
    parser.add_argument("--metadata-csv", type=Path, default=DEFAULT_METADATA_CSV, help="Metadata CSV path.")
    parser.add_argument("--assets-root", type=Path, default=DEFAULT_ASSETS_ROOT, help="Root directory for assets.")
    return parser.parse_args()


def load_metadata(csv_path: Path) -> List[Dict[str, str]]:
    if not csv_path.exists():
        raise FileNotFoundError(f"Metadata CSV not found: {csv_path}")

    with csv_path.open("r", newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        return [row for row in reader]


def classify_asset(row: Dict[str, str]) -> str:
    contrast = float(row["contrast"])
    sharpness = float(row["sharpness"])
    local_variance = float(row["local_variance"])
    edge_density = float(row["edge_density"])
    small_detail = float(row["small_scale_detail"])
    large_detail = float(row["large_scale_detail"])

    is_depth = (
        large_detail >= DEPTH_LARGE_DETAIL_MIN
        and contrast >= DEPTH_CONTRAST_MIN
        and sharpness <= DEPTH_SHARPNESS_MAX
    )

    is_scale = (
        sharpness >= SCALE_SHARPNESS_MIN
        and edge_density >= SCALE_EDGE_DENSITY_MIN
        and local_variance >= SCALE_LOCAL_VARIANCE_MIN
        and small_detail >= SCALE_SMALL_DETAIL_MIN
    )

    if is_depth and not is_scale:
        return "depth"
    if is_scale and not is_depth:
        return "scale"
    if is_depth and is_scale:
        # Prefer depth for balanced shading with detail
        return "depth"
    return "other"


def subtle_contrast_stretch(image: np.ndarray) -> np.ndarray:
    if not CONTRAST_STRETCH:
        return image
    img_min = image.min()
    img_max = image.max()
    if img_max <= img_min:
        return image
    stretched = cv2.normalize(image, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    return stretched


def ensure_directories(root: Path) -> Dict[str, Path]:
    paths = {
        "root": root,
        "depth": root / "depth",
        "scale": root / "scale",
        "other": root / "other",
        "source_tiles": root / "source_tiles",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def create_tiles(image: np.ndarray) -> List[np.ndarray]:
    height, width, _ = image.shape
    tiles: List[np.ndarray] = []

    if height >= TARGET_SIZE and width >= TARGET_SIZE:
        for y in range(0, height - TARGET_SIZE + 1, TARGET_SIZE):
            for x in range(0, width - TARGET_SIZE + 1, TARGET_SIZE):
                tile = image[y : y + TARGET_SIZE, x : x + TARGET_SIZE]
                tiles.append(tile)
    if tiles:
        return tiles

    scale = TARGET_SIZE / max(height, width)
    resized = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
    pad_vert = max(TARGET_SIZE - resized.shape[0], 0)
    pad_horiz = max(TARGET_SIZE - resized.shape[1], 0)
    top = pad_vert // 2
    bottom = pad_vert - top
    left = pad_horiz // 2
    right = pad_horiz - left
    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0])
    padded = padded[:TARGET_SIZE, :TARGET_SIZE]
    return [padded]


def save_tile(tile: np.ndarray, dest_path: Path) -> None:
    cv2.imwrite(str(dest_path), tile)
    print(f"Saved asset: {dest_path}")


def sanitize_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in {"-", "_"} else "_" for c in name)


def process_row(row: Dict[str, str], paths: Dict[str, Path], counters: Dict[str, int], writer: csv.DictWriter) -> None:
    source_path = Path(row["full_path"])
    if not source_path.exists():
        print(f"Missing source file, skipping: {source_path}")
        return

    asset_type = classify_asset(row)
    image = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    if image is None:
        print(f"Failed to read {source_path}")
        return

    image = subtle_contrast_stretch(image)
    tiles = create_tiles(image)

    base_counter = counters[asset_type]
    source_label = row["dataset_label"]
    safe_name = sanitize_filename(source_path.stem)

    for idx, tile in enumerate(tiles):
        tile_index = base_counter + idx
        asset_name = f"{asset_type}_tex_{tile_index:04d}.png"
        asset_path = paths[asset_type] / asset_name
        save_tile(tile, asset_path)

        source_tile_name = f"{source_label}_{safe_name}_tile_{idx:02d}.png"
        source_tile_path = paths["source_tiles"] / source_tile_name
        save_tile(tile, source_tile_path)

        writer.writerow(
            {
                "asset_type": asset_type,
                "asset_path": str(asset_path),
                "source_dataset": source_label,
                "source_filename": row["filename"],
                "tile_index": idx,
                "original_height": row["height"],
                "original_width": row["width"],
                "target_size": TARGET_SIZE,
                "sharpness": row["sharpness"],
                "local_variance": row["local_variance"],
                "edge_density": row["edge_density"],
                "small_scale_detail": row["small_scale_detail"],
                "large_scale_detail": row["large_scale_detail"],
            }
        )

    counters[asset_type] += len(tiles)


def build_assets(metadata_rows: List[Dict[str, str]], assets_root: Path) -> None:
    paths = ensure_directories(assets_root)
    index_csv_path = assets_root / "texture_assets_index.csv"

    counters = {"depth": 0, "scale": 0, "other": 0}
    fieldnames = [
        "asset_type",
        "asset_path",
        "source_dataset",
        "source_filename",
        "tile_index",
        "original_height",
        "original_width",
        "target_size",
        "sharpness",
        "local_variance",
        "edge_density",
        "small_scale_detail",
        "large_scale_detail",
    ]

    with index_csv_path.open("w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in metadata_rows:
            process_row(row, paths, counters, writer)

    print(f"Asset index written to {index_csv_path}")


def main() -> None:
    args = parse_args()

    metadata_rows = load_metadata(args.metadata_csv)
    print(f"Loaded {len(metadata_rows)} metadata rows from {args.metadata_csv}")

    build_assets(metadata_rows, args.assets_root)


if __name__ == "__main__":
    main()
