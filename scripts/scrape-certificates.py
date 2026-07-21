#!/usr/bin/env python3
"""Scrape Yale College certificate requirements from YCPS catalog pages.

Tabs (Overview / Summary of Requirements / Certificate) are client-side
DOM toggles — all content is embedded in HTML containers, so a plain
HTTP fetch + BeautifulSoup is sufficient (no Playwright required).
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "lib/data/certificates/manifest.json"
RAW_DIR = ROOT / "lib/data/certificates/raw"
BASE = "https://catalog.yale.edu"
UA = "YaleDegreeIntelligenceBot/1.0 (+certificate-requirements research)"


def fetch(url: str, retries: int = 4) -> str:
    last_err: Exception | None = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(2 ** i)
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def clean_text(node: Tag | None) -> str:
    if node is None:
        return ""
    text = node.get_text("\n", strip=True)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_tables(node: Tag | None) -> list[dict]:
    if node is None:
        return []
    tables = []
    for table in node.find_all("table"):
        rows = []
        for tr in table.find_all("tr"):
            cells = [c.get_text(" ", strip=True).replace("\xa0", " ") for c in tr.find_all(["th", "td"])]
            if any(cells):
                rows.append(cells)
        if rows:
            tables.append({"rows": rows})
    return tables


def container_candidates(soup: BeautifulSoup) -> dict[str, Tag]:
    out: dict[str, Tag] = {}
    for div in soup.find_all("div", id=True):
        tid = div.get("id") or ""
        if tid.endswith("container"):
            out[tid] = div
    return out


def pick_container(soup: BeautifulSoup, extract: str, cert_name: str) -> tuple[str, Tag | None]:
    containers = container_candidates(soup)
    if extract != "auto" and extract in containers:
        return extract, containers[extract]

    # Prefer explicit certificate / intensive containers when present.
    # Note: some departments use plural "certificatestextcontainer".
    preferred = (
        "certificatetextcontainer",
        "certificatestextcontainer",
        "intensivetextcontainer",
        "maptextcontainer",  # Education Studies Scholars Intensive tab
        "textcontainer",
    )
    for key in preferred:
        if key in containers:
            text = clean_text(containers[key]).lower()
            if key == "textcontainer" or "certif" in text or "scholar" in text:
                return key, containers[key]

    # Fallback: whole #content
    content = soup.select_one("#content") or soup.select_one("#textcontainer")
    return "content", content


def split_sections(text: str) -> dict[str, str]:
    """Best-effort split of overview vs requirements/summary sections."""
    patterns = [
        ("summary_of_requirements", r"(?i)\n(summary of\s+requirements?)\n"),
        ("requirements", r"(?i)\n(requirements(?: of the certificate)?)\n"),
        ("declaration", r"(?i)\n(declaration of candidacy)\n"),
    ]
    indices: list[tuple[str, int, int]] = []
    for name, pat in patterns:
        m = re.search(pat, "\n" + text + "\n")
        if m:
            # adjust for leading \n we added
            indices.append((name, m.start() - 1, m.end() - 1))
    indices.sort(key=lambda x: x[1])

    sections: dict[str, str] = {"overview": text}
    if not indices:
        return sections

    # overview is everything before first section heading
    first = indices[0][1]
    sections["overview"] = text[:first].strip()
    for i, (name, start, end) in enumerate(indices):
        stop = indices[i + 1][1] if i + 1 < len(indices) else len(text)
        sections[name] = text[end:stop].strip()
    return sections


def scrape_one(cert: dict, html_cache: dict[str, str]) -> dict:
    path = cert["url"]
    url = BASE + path if path.startswith("/") else path
    if path not in html_cache:
        html_cache[path] = fetch(url)
        time.sleep(0.35)
    html = html_cache[path]
    soup = BeautifulSoup(html, "html.parser")

    tabs = [
        {"label": a.get_text(" ", strip=True), "href": a.get("href"), "id": a.get("id")}
        for a in soup.select("#tabs a")
    ]

    extract = cert.get("extract", "auto")
    container_id, node = pick_container(soup, extract, cert["name"])
    full_text = clean_text(node)
    tables = extract_tables(node)

    # For language certs sharing a parent Certificates tab, try to isolate
    # the relevant subsection by certificate name keywords.
    isolate_notes = None
    if cert.get("category") == "advanced_language" and container_id == "certificatetextcontainer":
        isolate_notes = isolate_language_section(full_text, cert["name"])

    sections = split_sections(isolate_notes["text"] if isolate_notes else full_text)

    # Also capture Summary of Requirements tab if separate and this is a
    # dedicated certificate page (not a major page with Certificate tab).
    summary_tab = None
    if "summaryofrequirementstextcontainer" in container_candidates(soup) and container_id == "textcontainer":
        summary_tab = clean_text(container_candidates(soup)["summaryofrequirementstextcontainer"])

    page_title = ""
    h1 = soup.select_one("#content h1") or soup.find("h1")
    if h1:
        page_title = h1.get_text(" ", strip=True).replace("\xa0", " ")

    return {
        "id": cert["id"],
        "name": cert["name"],
        "category": cert["category"],
        "source_url": url,
        "page_title": page_title,
        "tabs": tabs,
        "extracted_from_container": container_id,
        "parent_program": cert.get("parent_program"),
        "requires_application": bool(cert.get("requires_application")),
        "full_text": isolate_notes["text"] if isolate_notes else full_text,
        "isolation": isolate_notes,
        "sections": sections,
        "summary_of_requirements_tab": summary_tab,
        "tables": tables,
        "raw_html_length": len(html),
    }


def isolate_language_section(full_text: str, name: str) -> dict:
    """Try to carve out the subsection for a specific language certificate."""
    # Normalize common headings
    aliases = {
        "Ancient Egyptian": [r"Ancient Egyptian"],
        "Ancient Greek": [r"Ancient Greek", r"Greek"],
        "Modern Arabic": [r"Modern Arabic", r"Arabic"],
        "Modern Hebrew": [r"Modern Hebrew", r"Hebrew"],
        "Modern Turkish": [r"Modern Turkish", r"Turkish"],
        "Chinese": [r"Chinese"],
        "Japanese": [r"Japanese"],
        "Korean": [r"Korean"],
        "Hindi": [r"Hindi"],
        "Sanskrit": [r"Sanskrit"],
        "Indonesian": [r"Indonesian"],
        "Vietnamese": [r"Vietnamese"],
        "isiZulu": [r"isiZulu", r"Zulu"],
        "Kiswahili": [r"Kiswahili", r"Swahili"],
        "Yoruba": [r"Yoruba"],
        "Latin": [r"Latin"],
        "French": [r"French"],
        "German": [r"German"],
        "Italian": [r"Italian"],
        "Portuguese": [r"Portuguese"],
        "Russian": [r"Russian"],
        "Spanish": [r"Spanish"],
    }
    keys = aliases.get(name, [re.escape(name)])
    # Find headings that mention this language near "certificate" or as H-like lines
    lines = full_text.split("\n")
    start = None
    for i, line in enumerate(lines):
        low = line.lower()
        if any(re.search(k, line, re.I) for k in keys) and (
            "certif" in low or "requirement" in low or i < 5 or line.isupper() or line.istitle()
        ):
            # Prefer stronger matches
            if any(re.search(rf"\b{k}\b", line, re.I) for k in keys):
                start = i
                break
    if start is None:
        # fallback: search any mention
        for i, line in enumerate(lines):
            if any(re.search(rf"\b{k}\b", line, re.I) for k in keys):
                start = i
                break
    if start is None:
        return {"mode": "full_shared_container", "text": full_text, "matched_name": name}

    # End at next language-ish certificate heading or major section
    end = len(lines)
    other_langs = [
        "Arabic", "Hebrew", "Turkish", "Egyptian", "Chinese", "Japanese", "Korean",
        "Hindi", "Sanskrit", "Indonesian", "Vietnamese", "isiZulu", "Kiswahili",
        "Yoruba", "Greek", "Latin", "French", "German", "Italian", "Portuguese",
        "Russian", "Spanish",
    ]
    for j in range(start + 2, len(lines)):
        line = lines[j]
        if re.search(r"(?i)^requirements for the", line) or re.search(r"(?i)^certificate of", line):
            # another cert block
            if not any(re.search(rf"\b{k}\b", line, re.I) for k in keys):
                end = j
                break
        # All-caps or title-like language headings
        if re.match(r"^(Chinese|Japanese|Korean|Hindi|Sanskrit|Indonesian|Vietnamese|isiZulu|Kiswahili|Yoruba|Latin|Ancient Greek|Modern Arabic|Modern Hebrew|Modern Turkish|Ancient Egyptian)\b", line):
            if not any(re.search(rf"\b{k}\b", line, re.I) for k in keys):
                end = j
                break
    chunk = "\n".join(lines[start:end]).strip()
    return {"mode": "isolated_subsection", "text": chunk or full_text, "start_line": start, "end_line": end, "matched_name": name}


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    html_cache: dict[str, str] = {}
    results = []
    errors = []

    for cert in manifest["certificates"]:
        print(f"Scraping {cert['id']} ...", flush=True)
        try:
            data = scrape_one(cert, html_cache)
            out = RAW_DIR / f"{cert['id']}.json"
            out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
            results.append(
                {
                    "id": cert["id"],
                    "name": cert["name"],
                    "ok": True,
                    "chars": len(data["full_text"]),
                    "container": data["extracted_from_container"],
                    "tabs": [t["label"] for t in data["tabs"]],
                    "has_summary_section": bool(data["sections"].get("summary_of_requirements")),
                    "tables": len(data["tables"]),
                }
            )
            print(f"  ok — {len(data['full_text'])} chars from #{data['extracted_from_container']}")
        except Exception as e:  # noqa: BLE001
            errors.append({"id": cert["id"], "error": str(e)})
            print(f"  FAIL: {e}")

    index = {
        "source": manifest["source"],
        "edition": manifest["edition"],
        "scraped_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors,
    }
    (RAW_DIR / "_index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(f"\nDone. {len(results)} ok, {len(errors)} errors. Index → {RAW_DIR / '_index.json'}")


if __name__ == "__main__":
    main()
