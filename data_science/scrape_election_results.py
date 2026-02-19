#!/usr/bin/env python3
"""Scrape election result tables from news pages and export raw + standardized datasets."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import time
from typing import Dict, Iterable, List, Tuple

import requests
from bs4 import BeautifulSoup

SOURCES = [
    {"name": "tbs", "url": "https://www.tbsnews.net/election-2026"},
    {"name": "prothom_alo", "url": "https://election.prothomalo.com/"},
    {"name": "daily_star", "url": "https://www.thedailystar.net/news/national-election-2026"},
]

TARGET_FIELDS = ["constituency", "candidates", "party", "votes", "turnout", "margin"]

FIELD_PATTERNS = {
    "constituency": ["constituency", "seat", "electorate"],
    "candidates": ["candidate", "name"],
    "party": ["party"],
    "votes": ["vote", "votes", "valid vote"],
    "turnout": ["turnout", "turn out"],
    "margin": ["margin", "majority", "lead"],
}

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", header.lower()).strip()


def fetch_html(url: str, timeout: int = 30) -> str:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
    response.raise_for_status()
    return response.text


def extract_tables(html: str) -> Tuple[str, List[Dict[str, str]]]:
    soup = BeautifulSoup(html, "html.parser")
    page_title = clean_text(soup.title.get_text()) if soup.title else ""
    tables = soup.find_all("table")
    raw_rows: List[Dict[str, str]] = []

    for table_index, table in enumerate(tables):
        headers = get_headers(table)
        rows = parse_rows(table, headers)
        for row_index, row in enumerate(rows):
            row_meta = {
                "table_index": str(table_index),
                "row_index": str(row_index),
            }
            raw_rows.append({**row_meta, **row})

    return page_title, raw_rows


def get_headers(table) -> List[str]:
    thead = table.find("thead")
    if thead:
        header_cells = thead.find_all(["th", "td"])
        headers = [clean_text(cell.get_text()) for cell in header_cells]
        headers = [h for h in headers if h]
        if headers:
            return headers

    first_row = table.find("tr")
    if first_row:
        header_cells = first_row.find_all(["th", "td"])
        headers = [clean_text(cell.get_text()) for cell in header_cells]
        headers = [h for h in headers if h]
        if headers:
            return headers

    return []


def parse_rows(table, headers: List[str]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        values = [clean_text(cell.get_text()) for cell in cells]
        if not values:
            continue
        if headers and values == headers:
            continue
        if not headers:
            headers = [f"col_{i + 1}" for i in range(len(values))]
        row = {}
        for i, value in enumerate(values):
            key = headers[i] if i < len(headers) else f"col_{i + 1}"
            row[key] = value
        rows.append(row)
    return rows


def standardize_row(row: Dict[str, str]) -> Dict[str, str]:
    normalized = {normalize_header(key): key for key in row.keys()}
    standardized = {field: "" for field in TARGET_FIELDS}

    for field, patterns in FIELD_PATTERNS.items():
        for header_norm, original in normalized.items():
            if any(pattern in header_norm for pattern in patterns):
                standardized[field] = row.get(original, "")
                break

    return standardized


def write_json(path: str, payload: Iterable[Dict[str, str]]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(list(payload), handle, ensure_ascii=False, indent=2)


def write_csv(path: str, rows: List[Dict[str, str]]) -> None:
    if not rows:
        return
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def scrape_source(name: str, url: str, sleep_seconds: float) -> Dict[str, List[Dict[str, str]]]:
    html = fetch_html(url)
    page_title, raw_rows = extract_tables(html)
    scraped_at = dt.datetime.utcnow().isoformat() + "Z"

    raw_payload = []
    standard_payload = []
    for row in raw_rows:
        raw_payload.append(
            {
                "source": name,
                "url": url,
                "page_title": page_title,
                "scraped_at": scraped_at,
                **row,
            }
        )
        standard_payload.append(
            {
                "source": name,
                "url": url,
                "page_title": page_title,
                "scraped_at": scraped_at,
                **standardize_row(row),
            }
        )

    time.sleep(sleep_seconds)
    return {"raw": raw_payload, "standard": standard_payload}


def build_output_paths(out_dir: str, source: str, date_stamp: str) -> Dict[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    raw_path = os.path.join(out_dir, f"{source}_raw_{date_stamp}.json")
    standard_json = os.path.join(out_dir, f"{source}_standard_{date_stamp}.json")
    standard_csv = os.path.join(out_dir, f"{source}_standard_{date_stamp}.csv")
    return {"raw": raw_path, "standard_json": standard_json, "standard_csv": standard_csv}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape election result tables from news sites.")
    parser.add_argument(
        "--out-dir",
        default=os.path.join("data_science", "data", "raw", "news_scrape"),
        help="Directory for output files.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Seconds to wait between requests.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    date_stamp = dt.date.today().isoformat()

    for source in SOURCES:
        name = source["name"]
        url = source["url"]
        payloads = scrape_source(name, url, args.sleep)
        paths = build_output_paths(args.out_dir, name, date_stamp)
        write_json(paths["raw"], payloads["raw"])
        write_json(paths["standard_json"], payloads["standard"])
        write_csv(paths["standard_csv"], payloads["standard"])
        print(f"Saved {name} raw: {paths['raw']}")
        print(f"Saved {name} standard JSON: {paths['standard_json']}")
        print(f"Saved {name} standard CSV: {paths['standard_csv']}")


if __name__ == "__main__":
    main()
