#!/usr/bin/env python3
"""Generate styled HTML (+ optional PDF) from release & pitch markdown docs."""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "dist"
MOCKUP_SRC = ROOT / "mockups" / "12-mobile-pager-pitch.html"

DOCS = [
    ("MOBILE-PAGER-SCOPE.md", "Lotris Pager — Scope & Investment Proposal"),
    ("BRD.md", "Lotris — Business Requirements Document"),
    ("IT-HANDOVER.md", "Lotris — IT Handover Document"),
    ("PROJECT-CLOSEOUT.md", "Lotris — Project Closeout"),
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    :root {{
      --ink: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --accent: #4f46e5;
      --bg: #f8fafc;
      --card: #ffffff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: var(--ink);
      background: var(--bg);
    }}
    .toolbar {{
      position: sticky; top: 0; z-index: 10;
      background: var(--card); border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;
      font-size: 0.875rem;
    }}
    .toolbar a {{ color: var(--accent); text-decoration: none; }}
    .toolbar a:hover {{ text-decoration: underline; }}
    .toolbar .sep {{ color: var(--border); }}
    main {{
      max-width: 920px; margin: 0 auto; padding: 2rem 1.5rem 4rem;
      background: var(--card); min-height: 100vh;
      box-shadow: 0 0 0 1px var(--border);
    }}
    h1 {{ font-size: 1.75rem; margin-top: 0; border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem; }}
    h2 {{ font-size: 1.35rem; margin-top: 2rem; color: #0f172a; }}
    h3 {{ font-size: 1.1rem; margin-top: 1.5rem; }}
    blockquote {{
      margin: 1rem 0; padding: 0.75rem 1rem;
      border-left: 4px solid var(--accent); background: #f1f5f9; color: var(--muted);
    }}
    table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem; }}
    th, td {{ border: 1px solid var(--border); padding: 0.5rem 0.65rem; text-align: left; vertical-align: top; }}
    th {{ background: #f1f5f9; font-weight: 600; }}
    tr:nth-child(even) td {{ background: #fafafa; }}
    code {{
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.88em; background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px;
    }}
    pre {{
      background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 8px;
      overflow-x: auto; font-size: 0.85rem;
    }}
    pre code {{ background: none; padding: 0; color: inherit; }}
    hr {{ border: none; border-top: 1px solid var(--border); margin: 2rem 0; }}
    a {{ color: var(--accent); }}
    ul, ol {{ padding-left: 1.5rem; }}
    li {{ margin: 0.25rem 0; }}
    @media print {{
      .toolbar {{ display: none; }}
      body {{ background: white; }}
      main {{ box-shadow: none; max-width: none; padding: 0; }}
    }}
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>Lotris docs</strong>
    <a href="index.html">Index</a>
    <span class="sep">|</span>
    <a href="MOBILE-PAGER-SCOPE.html">Pager scope</a>
    <a href="mobile-pager-mockups.html">Mockups</a>
    <span class="sep">|</span>
    <a href="BRD.html">BRD</a>
    <a href="IT-HANDOVER.html">IT Handover</a>
    <span style="margin-left:auto;color:var(--muted)">Print → Save as PDF</span>
  </div>
  <main>
{body}
  </main>
</body>
</html>
"""

INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Lotris — Documentation pack</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 760px; margin: 3rem auto; padding: 0 1.5rem; color: #1e293b; }}
    h1 {{ color: #4f46e5; font-size: 1.75rem; }}
    h2 {{ font-size: 1.15rem; margin-top: 2rem; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; }}
    a {{ color: #4f46e5; font-size: 1.05rem; }}
    li {{ margin: 0.65rem 0; line-height: 1.5; }}
    .desc {{ font-size: 0.9rem; color: #64748b; margin-left: 0; }}
    .note {{ background: #f1f5f9; padding: 1rem 1.25rem; border-radius: 8px; margin-top: 2rem; font-size: 0.9rem; line-height: 1.6; }}
    .badge {{ display: inline-block; background: #eef2ff; color: #4338ca; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; margin-left: 6px; vertical-align: middle; }}
  </style>
</head>
<body>
  <h1>Lotris — Documentation pack</h1>
  <p>Generated for sharing (HTML + PDF). Regenerate: <code>pnpm docs:release:pdf</code></p>

  <h2>Mobile Pager — management pitch <span class="badge">NEW</span></h2>
  <ul>
    <li><a href="MOBILE-PAGER-SCOPE.html">Mobile Pager Scope &amp; Investment Proposal</a> <span class="desc">— change board / executive pitch (PDF available)</span></li>
    <li><a href="mobile-pager-mockups.html">Interactive UI mockups</a> <span class="desc">— 6 phone screens for presentation</span></li>
  </ul>

  <h2>Release &amp; operations</h2>
  <ul>
    <li><a href="BRD.html">Business Requirements Document (BRD)</a></li>
    <li><a href="IT-HANDOVER.html">IT Handover</a> — CIO / IT operations</li>
    <li><a href="PROJECT-CLOSEOUT.html">Project Closeout</a></li>
  </ul>

  <div class="note">
    <strong>PDF files</strong> sit alongside HTML in this folder (<code>*.pdf</code>).<br>
    <strong>Mockups</strong> require <code>style-v2.css</code> — copied into <code>docs/dist/</code> when you run the generator.
  </div>
</body>
</html>
"""


def md_to_html(text: str) -> str:
    result = subprocess.run(
        ["npx", "--yes", "marked", "--gfm"],
        input=text,
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=True,
    )
    return result.stdout


def write_html(name: str, title: str, md_path: Path) -> Path:
    body = md_to_html(md_path.read_text(encoding="utf-8"))
    out = OUT / f"{name}.html"
    out.write_text(HTML_TEMPLATE.format(title=title, body=body), encoding="utf-8")
    return out


def write_pdf(html_path: Path) -> Path | None:
    chrome = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        return None
    pdf_path = html_path.with_suffix(".pdf")
    html_uri = html_path.resolve().as_uri()
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            f"--print-to-pdf={pdf_path.resolve()}",
            html_uri,
        ],
        check=True,
        capture_output=True,
    )
    return pdf_path


def copy_mockups() -> None:
    if not MOCKUP_SRC.exists():
        print(f"Skip mockup — missing {MOCKUP_SRC}")
        return
    style_src = ROOT / "mockups" / "style-v2.css"
    if style_src.exists():
        shutil.copy2(style_src, OUT / "style-v2.css")
    dest = OUT / "mobile-pager-mockups.html"
    html = MOCKUP_SRC.read_text(encoding="utf-8")
    html = html.replace('href="../docs/MOBILE-PAGER-SCOPE.md"', 'href="MOBILE-PAGER-SCOPE.html"')
    dest.write_text(html, encoding="utf-8")
    print(f"Mockup → {dest.relative_to(ROOT)}")


def main() -> None:
    pdf = "--pdf" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(INDEX_TEMPLATE, encoding="utf-8")
    copy_mockups()

    generated: list[Path] = []
    for filename, title in DOCS:
        md_path = ROOT / "docs" / filename
        if not md_path.exists():
            print(f"Skip missing {md_path}")
            continue
        html = write_html(md_path.stem, title, md_path)
        generated.append(html)
        print(f"HTML → {html.relative_to(ROOT)}")

    if pdf:
        for html in generated:
            try:
                pdf_path = write_pdf(html)
                if pdf_path:
                    print(f"PDF  → {pdf_path.relative_to(ROOT)}")
            except subprocess.CalledProcessError:
                print(f"PDF failed for {html.name}: use browser Print → Save as PDF")

    index = (OUT / "index.html").resolve()
    print(f"\nOpen: {index.as_uri()}")


if __name__ == "__main__":
    main()
