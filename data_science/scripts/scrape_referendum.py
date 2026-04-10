#!/usr/bin/env python3
"""
Dhaka Tribune Election Data Scraper
=====================================
Scrapes election results from:
  - https://election.dhakatribune.com/referendum

Outputs:
    - referendum_results.csv

Requirements:
  pip install playwright pandas

Usage:
    /home/billy/X/Election-Dashboard/.venv/bin/python data_science/scripts/dhakatribune_election_scraper.py
"""

import json
import time
import csv
from pathlib import Path
from datetime import datetime

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Playwright not found. Install with:")
    print("  pip install playwright")
    print("  playwright install chromium")
    raise

# ── Config ──────────────────────────────────────────────────────────────────
REFERENDUM_URL = "https://election.dhakatribune.com/referendum"
OUTPUT_PREFIX = "dhaka_tribune_referendum"
OUTPUT_DIR = Path("/home/billy/X/Election-Dashboard/data_science/data/raw/news_scrape")
WAIT_TIMEOUT = 30_000   # ms – max wait for page elements
SCROLL_PAUSE  = 1.5     # seconds between scroll steps


# ── Helpers ──────────────────────────────────────────────────────────────────
def save_json(data: list[dict], path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✔ JSON saved  → {path}  ({len(data)} records)")


def save_csv(data: list[dict], path: Path):
    if not data:
        print("  ⚠ No data to write to CSV")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if HAS_PANDAS:
        import pandas as pd

        pd.DataFrame(data).to_csv(path, index=False, encoding="utf-8-sig")
    else:
        keys = list(data[0].keys())
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(data)
    print(f"  ✔ CSV  saved  → {path}  ({len(data)} records)")


def scroll_to_bottom(page, max_scrolls: int = 12):
    """Gradually scroll to trigger lazy-loaded content without looping forever."""
    prev_height = 0
    for _ in range(max_scrolls):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(SCROLL_PAUSE)
        height = page.evaluate("document.body.scrollHeight")
        if height == prev_height:
            break
        prev_height = height


def intercept_network(page):
    """
    Capture XHR/fetch responses that look like referendum API calls.
    Returns a list of captured (url, json_body) tuples.
    """
    captured = []

    def handle_response(response):
        url = response.url
        ct  = response.headers.get("content-type", "")
        if "json" in ct and any(kw in url for kw in [
            "referendum", "seat", "vote", "api", "graphql", "data"
        ]):
            try:
                body = response.json()
                captured.append({"url": url, "data": body})
                print(f"    [API] Captured: {url}")
            except Exception:
                pass

    page.on("response", handle_response)
    return captured


def flatten_dict(d: dict, prefix="", sep="__") -> dict:
    """Recursively flatten a nested dict."""
    items = {}
    for k, v in d.items():
        key = f"{prefix}{sep}{k}" if prefix else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, key, sep))
        elif isinstance(v, list):
            items[key] = json.dumps(v, ensure_ascii=False)
        else:
            items[key] = v
    return items


# ── Scrape referendum ────────────────────────────────────────────────────────
def scrape_referendum(page) -> list[dict]:
    print("\nScraping referendum results…")
    url = REFERENDUM_URL
    captured = intercept_network(page)

    page.goto(url, wait_until="domcontentloaded", timeout=WAIT_TIMEOUT)
    scroll_to_bottom(page)
    time.sleep(2)

    # Strategy A: API interception
    if captured:
        print(f"  Found {len(captured)} API response(s)")
        best = max(captured, key=lambda x: len(json.dumps(x["data"])))
        raw  = best["data"]
        print(f"  Using API response from: {best['url']}")
        return normalise_referendum_api(raw)

    # Strategy B: DOM scraping for referendum-specific layout
    print("  No API captured – falling back to DOM scraping…")
    return dom_scrape_referendum(page)


def normalise_referendum_api(raw) -> list[dict]:
    """Flatten referendum API payload."""
    records = []
    if isinstance(raw, list):
        for item in raw:
            records.append(flatten_dict(item) if isinstance(item, dict) else {"value": item})
    elif isinstance(raw, dict):
        records.append(flatten_dict(raw))
    return records


def dom_scrape_referendum(page) -> list[dict]:
    """Scrape referendum results from the DOM."""
    records = []

    # Referendum pages often show yes/no totals prominently
    js_data = page.evaluate("""
        () => {
            const result = {};

            // Look for yes/no counts
            document.querySelectorAll('[class*="yes"], [class*="no"], [class*="vote"]').forEach(el => {
                const text = el.innerText.trim();
                const num  = text.match(/\\d[\\d,]+/);
                if (num) {
                    result[el.className || el.tagName] = {
                        text: text,
                        number: parseInt(num[0].replace(/,/g, ''))
                    };
                }
            });

            // Also grab all heading + number pairs
            const questions = [];
            document.querySelectorAll('h1,h2,h3,h4,[class*="question"],[class*="proposal"]').forEach(h => {
                const next = h.nextElementSibling;
                questions.push({
                    question: h.innerText.trim(),
                    context:  next ? next.innerText.trim() : ''
                });
            });

            return { vote_elements: result, questions };
        }
    """)
    records.append(js_data)

    # Also try table rows
    rows = page.query_selector_all("table tbody tr")
    for row in rows:
        text = row.inner_text().strip()
        if text:
            cells = [c.inner_text().strip() for c in row.query_selector_all("td,th")]
            records.append({"cells": cells, "raw": text})

    return records


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("=" * 60)
    print("  Dhaka Tribune Election Scraper")
    print(f"  Output dir: {OUTPUT_DIR.resolve()}")
    print("=" * 60)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )

        # ── Referendum ────────────────────────────────────────────────────
        page = context.new_page()
        try:
            ref = scrape_referendum(page)
            if ref:
                save_csv (ref, OUTPUT_DIR / f"{OUTPUT_PREFIX}_raw_{timestamp}.csv")
            else:
                print("  ⚠ No referendum records found.")
        except Exception as e:
            print(f"  ✗ Referendum scraping failed: {e}")
        finally:
            page.close()

        browser.close()

    print("\n✅ Done! Files saved in:", OUTPUT_DIR.resolve())


if __name__ == "__main__":
    main()