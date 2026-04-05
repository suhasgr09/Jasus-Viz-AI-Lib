"""Ensure the workspace root is on sys.path for all tests."""
import sys
from pathlib import Path

# Add repo root so `src.*` imports work
sys.path.insert(0, str(Path(__file__).parent))
