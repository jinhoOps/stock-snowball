from __future__ import annotations

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tools.market_data import MarketDataError, refresh_all, validate_generated_data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Manually refresh or validate static market-data CSV files."
    )
    parser.add_argument("--check", action="store_true", help="Validate local files without fetching.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=PROJECT_ROOT / "src/data/indices",
        help="Directory containing CSV files and manifest.json.",
    )
    arguments = parser.parse_args(argv)

    try:
        entries = (
            validate_generated_data(arguments.data_dir)
            if arguments.check
            else refresh_all(arguments.data_dir)
        )
    except MarketDataError as error:
        print(f"Market data error: {error}", file=sys.stderr)
        return 1

    for asset_id, entry in entries.items():
        print(f"{asset_id}: {entry.start_date} to {entry.end_date} ({entry.row_count} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
