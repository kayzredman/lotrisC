#!/usr/bin/env python3
"""Regenerate the endpoint index section in docs/API.md from docs/openapi/v1.json."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "docs" / "openapi" / "v1.json"
API_MD = ROOT / "docs" / "API.md"
START = "<!-- API_ENDPOINTS:START -->"
END = "<!-- API_ENDPOINTS:END -->"


def build_endpoint_section(spec: dict) -> str:
    paths = spec.get("paths", {})
    groups: dict[str, list[tuple[str, str, str]]] = defaultdict(list)

    for path, methods in sorted(paths.items()):
        for method, op in methods.items():
            if method in ("parameters", "servers", "summary", "description"):
                continue
            if not isinstance(op, dict):
                continue
            tag = (op.get("tags") or ["Other"])[0]
            summary = op.get("summary") or op.get("operationId") or ""
            groups[tag].append((method.upper(), path, summary))

    lines = [
        START,
        "",
        f"_Auto-generated from `docs/openapi/v1.json` — **{sum(len(v) for v in groups.values())} operations** across **{len(paths)} paths**._",
        "",
    ]

    for tag in sorted(groups.keys()):
        entries = groups[tag]
        lines.append(f"### {tag} ({len(entries)})")
        lines.append("")
        for method, path, summary in entries:
            suffix = f" — {summary}" if summary else ""
            lines.append(f"- `{method} {path}`{suffix}")
        lines.append("")

    lines.append(END)
    return "\n".join(lines)


def main() -> None:
    if not SPEC_PATH.exists():
        raise SystemExit(f"Missing {SPEC_PATH}. Run: ./scripts/export-openapi.sh")

    spec = json.loads(SPEC_PATH.read_text())
    section = build_endpoint_section(spec)

    if not API_MD.exists():
        raise SystemExit(f"Missing {API_MD}")

    content = API_MD.read_text()
    if START not in content or END not in content:
        raise SystemExit(f"Markers {START} / {END} not found in {API_MD}")

    before, rest = content.split(START, 1)
    _, after = rest.split(END, 1)
    API_MD.write_text(before + section + after)
    print(f"Updated endpoint index in {API_MD}")


if __name__ == "__main__":
    main()
