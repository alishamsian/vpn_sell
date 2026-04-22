#!/usr/bin/env python3
"""یک‌بار: جایگزینی کلاس‌های پرتکرار با توکن‌های تم (canvas/panel/stroke/ink/...)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLOBS = ["app/**/*.tsx", "components/**/*.tsx"]

# ترتیب مهم: الگوهای طولانی‌تر اول
SUBS: list[tuple[str, str]] = [
    (r"\bbg-white/", "bg-panel/"),
    (r"\bbg-white\b", "bg-panel"),
    (r"\bbg-slate-50/", "bg-inset/"),
    (r"\bbg-slate-50\b", "bg-inset"),
    (r"\bbg-slate-100/", "bg-elevated/"),
    (r"\bbg-slate-100\b", "bg-elevated"),
    (r"\bborder-slate-200/90\b", "border-stroke/90"),
    (r"\bborder-slate-200/80\b", "border-stroke/80"),
    (r"\bborder-slate-200\b", "border-stroke"),
    (r"\bborder-slate-100\b", "border-stroke/70"),
    (r"\bborder-slate-300\b", "border-stroke"),
    (r"\bhover:border-slate-300\b", "hover:border-stroke"),
    (r"\bborder-slate-600\b", "border-stroke"),
    (r"\btext-slate-950\b", "text-ink"),
    (r"\btext-slate-900\b", "text-ink"),
    (r"\btext-slate-800\b", "text-ink"),
    (r"\btext-slate-700\b", "text-prose"),
    (r"\btext-slate-600\b", "text-prose"),
    (r"\btext-slate-500\b", "text-faint"),
    (r"\btext-slate-400\b", "text-faint"),
    (r"\bring-offset-white\b", "ring-offset-canvas"),
    (r"\bring-offset-slate-950\b", "ring-offset-canvas"),
    (r"\bdivide-slate-200\b", "divide-stroke"),
]


def patch_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    out = raw
    for pat, repl in SUBS:
        out = re.sub(pat, repl, out)
    if out != raw:
        path.write_text(out, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for pattern in GLOBS:
        for path in ROOT.glob(pattern):
            if patch_file(path):
                changed += 1
                print(path.relative_to(ROOT))
    print(f"Done. {changed} files changed.")


if __name__ == "__main__":
    main()
