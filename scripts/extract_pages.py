"""Utilities for splitting handwriting PDF scans into individual page images.
#!/usr/bin/env python3
This script converts PDFs to PNG pages, rotates each page 180° to correct the
upside-down scans, and writes the results to a flat output directory.
"""
from __future__ import annotations

import argparse
import cv2
import numpy as np
from pdf2image import convert_from_path


DEFAULT_DPI = 300


def iter_pdfs(input_dir: Path) -> Iterable[Path]:
    """Yield PDF files directly under ``input_dir`` sorted by name."""
    return sorted(path for path in input_dir.iterdir() if path.suffix.lower() == ".pdf")



#!/usr/bin/env python3
"""
Extracts individual, upright PNG page images from a directory of PDF scans.

Usage:
    python scripts/extract_pages.py <input_pdf_dir> <output_page_dir> [--dpi <int>]

- input_pdf_dir: path to directory with PDFs (e.g., handwriting_data/raw_pdfs)
- output_page_dir: path to directory to write PNGs (e.g., handwriting_data/pages)
- optional --dpi argument, default 300

Assumes all PDFs are upside down and rotates each page 180 degrees.
"""
import argparse
from pathlib import Path
from typing import Optional
import sys

import cv2
import numpy as np
from pdf2image import convert_from_path

def extract_pages(input_dir: Path, output_dir: Path, dpi: int = 300) -> None:
    """
    Extracts and rotates pages from PDFs into PNG files.
    Args:
        input_dir: Directory containing PDF files to process (non-recursive).
        output_dir: Directory where rotated PNG pages will be written.
        dpi: Rendering resolution passed to pdf2image.convert_from_path.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted([p for p in input_dir.iterdir() if p.suffix.lower() == ".pdf"])
    if not pdf_files:
        print(f"No PDFs found in {input_dir.resolve()}")
        return

    global_index = 0
    for pdf_path in pdf_files:
        print(f"Processing {pdf_path.name}...")
        try:
            pages = convert_from_path(str(pdf_path), dpi=dpi)
        except Exception as exc:
            print(f"Failed to convert {pdf_path.name}: {exc}")
            continue

        for page in pages:
            image_rgb = np.array(page)
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            rotated = cv2.rotate(image_bgr, cv2.ROTATE_180)
            output_name = f"{pdf_path.stem}_page_{global_index:04d}.png"
            output_path = output_dir / output_name
            success = cv2.imwrite(str(output_path), rotated)
            if success:
                print(f"  -> wrote {output_path}")
            else:
                print(f"  !! failed to write {output_path}")
            global_index += 1

def main() -> None:
    parser = argparse.ArgumentParser(description="Split PDFs into rotated PNG pages.")
    parser.add_argument("input_pdf_dir", type=Path, help="Directory containing PDF files")
    parser.add_argument("output_page_dir", type=Path, help="Directory to write PNG pages")
    parser.add_argument("--dpi", type=int, default=300, help="Rendering DPI (default: 300)")
    args = parser.parse_args()
    extract_pages(args.input_pdf_dir, args.output_page_dir, dpi=args.dpi)

if __name__ == "__main__":
    main()

def main() -> None:
    """Parse CLI arguments and run page extraction."""
    parser = argparse.ArgumentParser(description="Split PDFs into rotated PNG pages.")
    parser.add_argument("input_pdf_dir", type=Path, help="Directory containing PDF files")
    parser.add_argument("output_page_dir", type=Path, help="Directory to write PNG pages")
    parser.add_argument("--dpi", type=int, default=DEFAULT_DPI, help="Rendering DPI (default: 300)")

    args = parser.parse_args()
    extract_pages(args.input_pdf_dir, args.output_page_dir, dpi=args.dpi)


if __name__ == "__main__":
    main()
