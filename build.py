#!/usr/bin/env python3
"""Inline src/index.html into a single self-contained WarGame.html.

Every <link rel="stylesheet" href="X"> becomes <style>...</style> and every
<script src="X"></script> becomes <script>...</script>, with the file read
from the src folder. Run with: python build.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
INDEX = SRC / "index.html"
OUT = ROOT / "WarGame.html"

LINK_RE = re.compile(
    r"""<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>""",
    re.IGNORECASE,
)
SCRIPT_RE = re.compile(
    r"""<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*</script>""",
    re.IGNORECASE,
)


def read(path: Path) -> str:
    if not path.is_file():
        sys.exit("missing file: %s" % path)
    return path.read_text(encoding="utf-8")


def main() -> None:
    html = read(INDEX)
    missing = []

    def css(match: re.Match) -> str:
        path = SRC / match.group(1)
        if not path.is_file():
            missing.append(match.group(1))
            return match.group(0)
        return "<style>\n" + read(path).strip() + "\n</style>"

    def js(match: re.Match) -> str:
        path = SRC / match.group(1)
        if not path.is_file():
            missing.append(match.group(1))
            return match.group(0)
        body = read(path).strip().replace("</script>", "<\\/script>")
        return "<script>\n" + body + "\n</script>"

    html = LINK_RE.sub(css, html)
    html = SCRIPT_RE.sub(js, html)

    if missing:
        sys.exit("missing file(s): " + ", ".join(missing))

    OUT.write_text(html, encoding="utf-8", newline="\n")
    print("%s  %.1f KB" % (OUT, OUT.stat().st_size / 1024.0))


if __name__ == "__main__":
    main()
