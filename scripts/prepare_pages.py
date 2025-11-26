# scripts/prepare_pages.py
from pathlib import Path
from pdf2image import convert_from_path

PDF_DIR = Path("pfp theme")          # put your uploaded PDFs here
OUT_DIR = Path("data/pages")    # flat folder of page images

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDFs found in {PDF_DIR.resolve()}")
        return

    for pdf_path in pdf_files:
        print(f"Processing {pdf_path.name}...")
        # 300 dpi gives you plenty of detail; bump if you want more
        pages = convert_from_path(str(pdf_path), dpi=300)

        for i, page in enumerate(pages):
            # your scans are upside down: flip 180°
            page = page.rotate(180, expand=True)
            out_name = f"{pdf_path.stem}_p{i:03d}.png"
            out_path = OUT_DIR / out_name
            page.save(out_path)
            print(f"  -> {out_path}")

    print("Done.")

if __name__ == "__main__":
    main()
