#!/usr/bin/env python3
"""Build the pages War Game is served from.

Every <link rel="stylesheet" href="X"> in src/index.html becomes
<style>...</style> and every <script src="X"></script> becomes
<script>...</script>, with the file read from the src folder. The result is
written twice: docs/index.html, which GitHub Pages serves, and WarGame.html
at the folder root, the offline single file. docs/sw.js is written from
src/sw.js with __VERSION__ replaced by the first twelve hex digits of the
SHA-256 of docs/index.html, so every build invalidates the old cache, and
src/manifest.webmanifest is copied into docs/.

The icons in docs/icons are drawn by dev/make_icons.py and are not touched
here. Run with: python build.py
"""

import hashlib
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DOCS = ROOT / "docs"
INDEX = SRC / "index.html"
SW = SRC / "sw.js"
MANIFEST = SRC / "manifest.webmanifest"

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


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def inline() -> str:
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
    return html


def report(path: Path) -> None:
    print("%s  %.1f KB" % (path, path.stat().st_size / 1024.0))


def main() -> None:
    html = inline()

    page = DOCS / "index.html"
    write(page, html)
    single = ROOT / "WarGame.html"
    write(single, html)

    version = hashlib.sha256(page.read_bytes()).hexdigest()[:12]
    write(DOCS / "sw.js", read(SW).replace("__VERSION__", version))

    DOCS.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(MANIFEST, DOCS / "manifest.webmanifest")

    report(page)
    report(DOCS / "sw.js")
    report(DOCS / "manifest.webmanifest")
    report(single)
    print("cache version %s" % version)


if __name__ == "__main__":
    main()
