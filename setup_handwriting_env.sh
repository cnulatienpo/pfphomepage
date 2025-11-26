#!/usr/bin/env bash

set -e

# ---------------------------------------------------------
# Python tooling
# ---------------------------------------------------------
pip install --upgrade pip

# Core scientific + imaging stack
pip install \
    numpy \
    scipy \
    pillow \
    matplotlib \
    imageio \
    opencv-python \
    scikit-image \
    scikit-learn \
    tqdm \
    jupyter \
    ipykernel

# PDF + document handling
pip install \
    pdf2image \
    pymupdf

# Video / motion
pip install moviepy

# Font / type tooling
pip install \
    fonttools \
    ufoLib2 \
    fontmake

# Web / API bits (for later services / experiments)
pip install \
    flask \
    fastapi \
    uvicorn

# Utilities used by the ML repos
pip install \
    gdown \
    pyyaml \
    wandb

# PyTorch (CPU build, fine for Codespaces)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Handwrite CLI from PyPI (handwriting → font using FontForge/Potrace)
pip install handwrite

# ---------------------------------------------------------
# Clone key repos into ./external
# ---------------------------------------------------------
mkdir -p external
cd external

# HandFonted: handwriting scans → TTF using CV + PyTorch
if [ ! -d "HandFonted" ]; then
  git clone https://github.com/reshamgaire/HandFonted.git
  cd HandFonted
  # Install its specific Python deps if the file exists
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
  fi
  cd ..
fi

# Handwriting-Transformers (HWT): transformer-based styled handwriting generator
if [ ! -d "Handwriting-Transformers" ]; then
  git clone https://github.com/ankanbhunia/Handwriting-Transformers.git
  cd Handwriting-Transformers
  pip install --upgrade --no-cache-dir gdown
  cd ..
fi

# WriteViT: ViT-based handwritten text generation
if [ ! -d "WriteViT" ]; then
  git clone https://github.com/hnam-1765/WriteViT.git
  cd WriteViT
  pip install --upgrade --no-cache-dir gdown
  cd ..
fi

# Diffusion-Handwriting-Generation (PyTorch): diffusion model for handwriting
if [ ! -d "Diffusion-Handwriting-Generation.pytorch" ]; then
  git clone https://github.com/sleep3r/Diffusion-Handwriting-Generation.pytorch.git
  cd Diffusion-Handwriting-Generation.pytorch
  # Uses pyproject/poetry; core deps will mostly be satisfied by the stack above.
  # You can later run: make install
  cd ..
fi

cd ..

echo ""
echo "✅ Base handwriting / font / CV environment installed."
echo "Repos are in ./external. Run this script after activating any virtualenv you use."
echo "=== Updating system packages ==="
sudo apt-get update

echo "=== Installing system-level dependencies ==="
sudo apt-get install -y python3-dev python3-venv build-essential poppler-utils tesseract-ocr libgl1 ffmpeg

echo "=== Installing font tooling (for Handwrite-style workflows) ==="
sudo apt-get install -y fontforge potrace
