#!/usr/bin/env bash
set -euo pipefail

ENV_DIR="env"
PYTHON_BIN="python3"

if [ -d "$ENV_DIR" ]; then
  echo "Using existing virtual environment at $ENV_DIR"
else
  echo "Creating virtual environment at $ENV_DIR"
  "$PYTHON_BIN" -m venv "$ENV_DIR"
fi

# shellcheck disable=SC1091
. "$ENV_DIR/bin/activate"

python -m pip install --upgrade pip
pip install --upgrade opencv-python-headless pillow numpy

cat <<'MSG'

Python virtual environment is ready.
To activate in future sessions:
  source env/bin/activate

To confirm you are using the env interpreter:
  python -c "import sys; print(sys.executable)"
MSG
