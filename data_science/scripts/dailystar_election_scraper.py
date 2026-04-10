#!/usr/bin/env python3
"""Scrape election result tables from news pages and export CSV datasets.

/home/billy/X/Election-Dashboard/.venv/bin/python data_science/scripts/dailystar_election_scraper.py

"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import time
from typing import Any, Dict, List, Tuple

import requests
from bs4 import BeautifulSoup

SOURCES = [
    {"name": "daily_star", "url": "https://www.thedailystar.net/news/national-election-2026"}
]

TARGET_FIELDS = ["constituency", "candidates", "party", "votes", "turnout", "margin"]

CANDIDATE_FIELDS = [
    "constituency",
    "division",
    "district",
    "alliance",
    "candidate_count",
    "candidate_name",
    "party",
    "votes",
    "is_winner",
]

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


def extract_balanced_json_object(text: str, marker: str) -> Dict[str, object] | None:
    marker_index = text.find(marker)
    if marker_index < 0:
        return None

    start = text.find("{", marker_index)
    if start < 0:
        return None

    depth = 0
    in_string = False
    escaped = False
    quote_char = ""

    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote_char:
                in_string = False
            continue

        if char in ['"', "'"]:
            in_string = True
            quote_char = char
            continue

        if char == "{":
            depth += 1
            continue

        if char == "}":
            depth -= 1
            if depth == 0:
                payload = text[start : index + 1]
                try:
                    return json.loads(payload)
                except json.JSONDecodeError:
                    return None

    return None


def get_daily_star_constituency_data(soup: BeautifulSoup) -> Dict[str, Dict[str, Any]]:
    script = soup.find("script", {"type": "application/json"})
    if not script:
        return {}

    script_text = script.string or script.get_text() or ""
    if not script_text.strip():
        return {}

    try:
        payload = json.loads(script_text)
    except json.JSONDecodeError:
        return {}

    election_block = payload.get("electionMapBlock", {})
    constituency_data = election_block.get("constituencyData", {})
    if not isinstance(constituency_data, dict):
        return {}

    return constituency_data


def extract_daily_star_rows(soup: BeautifulSoup) -> List[Dict[str, str]]:
    constituency_data = get_daily_star_constituency_data(soup)
    if not constituency_data:
        return []

    rows: List[Dict[str, str]] = []
    for _, constituency in constituency_data.items():
        seat_name_raw = clean_text(str(constituency.get("seat_name", "")))
        seat_name = seat_name_raw.replace("_", " ").title()
        if not seat_name:
            continue

        winner = constituency.get("winner") or {}
        candidates = constituency.get("candidates") or []
        winner_name = clean_text(str(winner.get("title", "")))
        winner_party = clean_text(str(winner.get("party_name", "")))
        winner_votes = clean_text(str(winner.get("votes", "")))

        if not winner_name:
            for candidate in candidates:
                if str(candidate.get("is_winner", "")).lower() in {"1", "true", "yes"}:
                    winner_name = clean_text(str(candidate.get("title", "")))
                    winner_party = clean_text(str(candidate.get("party_name", "")))
                    winner_votes = clean_text(str(candidate.get("votes", "")))
                    break

        candidate_vote_values: List[int] = []
        for candidate in candidates:
            candidate_votes = re.sub(r"[^0-9]", "", str(candidate.get("votes", "")))
            if candidate_votes:
                candidate_vote_values.append(int(candidate_votes))

        margin = ""
        if candidate_vote_values:
            candidate_vote_values.sort(reverse=True)
            if len(candidate_vote_values) > 1:
                margin = str(candidate_vote_values[0] - candidate_vote_values[1])
            else:
                margin = str(candidate_vote_values[0])

        rows.append(
            {
                "constituency": seat_name,
                "candidates": winner_name,
                "party": winner_party,
                "votes": winner_votes,
                "turnout": clean_text(str(constituency.get("total_votes", ""))),
                "margin": margin,
            }
        )

    return rows


def extract_daily_star_candidate_rows(soup: BeautifulSoup) -> List[Dict[str, str]]:
    constituency_data = get_daily_star_constituency_data(soup)
    if not constituency_data:
        return []

    rows: List[Dict[str, str]] = []
    for _, constituency in constituency_data.items():
        seat_name_raw = clean_text(str(constituency.get("seat_name", "")))
        seat_name = seat_name_raw.replace("_", " ").title()
        if not seat_name:
            continue

        division = clean_text(str(constituency.get("division", "")))
        district = clean_text(str(constituency.get("district", "")))
        alliance = clean_text(str(constituency.get("alliance", "")))
        candidates = constituency.get("candidates") or []
        candidate_count = str(len(candidates))

        for candidate in candidates:
            rows.append(
                {
                    "constituency": seat_name,
                    "division": division,
                    "district": district,
                    "alliance": alliance,
                    "candidate_count": candidate_count,
                    "candidate_name": clean_text(str(candidate.get("title", ""))),
                    "party": clean_text(str(candidate.get("party_name", ""))),
                    "votes": clean_text(str(candidate.get("votes", ""))),
                    "is_winner": str(bool(candidate.get("is_winner", False))).lower(),
                }
            )

    return rows


def extract_tbs_summary_rows(html: str) -> List[Dict[str, str]]:
    payload = extract_balanced_json_object(html, "const electionResults")
    if not payload:
        return []

    parties = payload.get("parties", {})
    if not isinstance(parties, dict):
        return []

    rows: List[Dict[str, str]] = []
    for _, party_data in parties.items():
        if not isinstance(party_data, dict):
            continue
        party_name = clean_text(str(party_data.get("party_name", "")))
        seats_won = clean_text(str(party_data.get("seats_won", "")))
        if not party_name:
            continue
        rows.append(
            {
                "constituency": "",
                "candidates": "",
                "party": party_name,
                "votes": "",
                "turnout": "",
                "margin": seats_won,
            }
        )

    return rows


def extract_embedded_rows(html: str, soup: BeautifulSoup) -> List[Dict[str, str]]:
    daily_star_rows = extract_daily_star_rows(soup)
    if daily_star_rows:
        return daily_star_rows

    tbs_rows = extract_tbs_summary_rows(html)
    if tbs_rows:
        return tbs_rows

    return []


def extract_embedded_candidate_rows(html: str, soup: BeautifulSoup) -> List[Dict[str, str]]:
    daily_star_candidate_rows = extract_daily_star_candidate_rows(soup)
    if daily_star_candidate_rows:
        return daily_star_candidate_rows

    return []


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

    if raw_rows:
        return page_title, raw_rows

    embedded_rows = extract_embedded_rows(html, soup)
    for row_index, row in enumerate(embedded_rows):
        row_meta = {
            "table_index": "embedded",
            "row_index": str(row_index),
        }
        raw_rows.append({**row_meta, **row})

    return page_title, raw_rows


def extract_candidate_rows(html: str) -> List[Dict[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    return extract_embedded_candidate_rows(html, soup)


def get_headers(table) -> List[str]:
    thead = table.find("thead")
    if thead:
        header_cells = thead.find_all(["th", "td"])
        headers = [clean_text(cell.get_text()) for cell in header_cells]
        headers = [h for h in headers if h]
        if headers:
            return headers

    first_row = table.find("tr")
    if first_row and first_row.find_all("th"):
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
    candidate_rows = extract_candidate_rows(html)
    scraped_at = dt.datetime.now(dt.UTC).isoformat().replace("+00:00", "Z")

    raw_payload = []
    standard_payload = []
    candidate_payload = []
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

    for row in candidate_rows:
        candidate_payload.append(
            {
                "source": name,
                "url": url,
                "page_title": page_title,
                "scraped_at": scraped_at,
                **{field: row.get(field, "") for field in CANDIDATE_FIELDS},
            }
        )

    time.sleep(sleep_seconds)
    return {"raw": raw_payload, "standard": standard_payload, "candidates": candidate_payload}


def build_output_paths(out_dir: str, source: str, date_stamp: str) -> Dict[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    raw_csv = os.path.join(out_dir, f"{source}_raw_{date_stamp}.csv")
    standard_csv = os.path.join(out_dir, f"{source}_standard_{date_stamp}.csv")
    candidates_csv = os.path.join(out_dir, f"{source}_candidates_{date_stamp}.csv")
    return {
        "raw_csv": raw_csv,
        "standard_csv": standard_csv,
        "candidates_csv": candidates_csv,
    }


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
        try:
            payloads = scrape_source(name, url, args.sleep)
            paths = build_output_paths(args.out_dir, name, date_stamp)
            write_csv(paths["raw_csv"], payloads["raw"])
            write_csv(paths["standard_csv"], payloads["standard"])
            write_csv(paths["candidates_csv"], payloads["candidates"])
            print(f"Saved {name} raw CSV: {paths['raw_csv']}")
            print(f"Saved {name} standard CSV: {paths['standard_csv']}")
            print(f"Saved {name} candidates CSV: {paths['candidates_csv']}")
        except requests.RequestException as exc:
            print(f"Skipping {name} due to request error: {exc}")
        except Exception as exc:
            print(f"Skipping {name} due to unexpected error: {exc}")


if __name__ == "__main__":
    main()
