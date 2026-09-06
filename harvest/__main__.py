from __future__ import annotations

import argparse
import importlib
from collections.abc import Sequence


COMMANDS = ("scan", "merge", "stats", "embed", "edges", "report", "prune", "audit")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in COMMANDS:
        subparsers.add_parser(command, add_help=False)
    args, remainder = parser.parse_known_args(argv)

    module_name = "report" if args.command == "audit" else args.command
    module = importlib.import_module(f"harvest.{module_name}")
    handler = getattr(module, "audit_main" if args.command == "audit" else "main")
    return int(handler(remainder) or 0)


if __name__ == "__main__":
    raise SystemExit(main())
