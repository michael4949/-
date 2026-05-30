import pathlib
import sys

# Make the `mnemo` package importable when running pytest from anywhere.
sys.path.insert(0, str(pathlib.Path(__file__).parent))
