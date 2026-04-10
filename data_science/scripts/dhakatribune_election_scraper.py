#!/usr/bin/env python3
"""Scrape Dhaka Tribune homepage-backed election datasets and export CSV files.

/home/billy/X/Election-Dashboard/.venv/bin/python data_science/scripts/dhakatribune_home_data_scraper.py

"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, Iterable, List

import requests

BASE_URL = "https://election.dhakatribune.com"
SEATS_ENDPOINT = BASE_URL + "/get-seats/{division_id}"
CANDIDATES_ENDPOINT = BASE_URL + "/get-candidate/{seat_id}"
HOME_RESULTS_ENDPOINT = BASE_URL + "/result-home"
DEFAULT_DIVISION_IDS = list(range(1, 9))
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}


def fetch_json(url: str, timeout: int) -> Any:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
    response.raise_for_status()
    return response.json()


def fetch_seats(division_ids: List[int], timeout: int) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for division_id in division_ids:
        url = SEATS_ENDPOINT.format(division_id=division_id)
        payload = fetch_json(url, timeout)
        if not isinstance(payload, list):
            continue
        for item in payload:
            if not isinstance(item, dict):
                continue
            rows.append({"division_request_id": division_id, **item})
        print(f"Division {division_id}: {len(payload)} seats")

    deduped: Dict[Any, Dict[str, Any]] = {}
    passthrough: List[Dict[str, Any]] = []
    for row in rows:
        row_id = row.get("id")
        if row_id is None:
            passthrough.append(row)
        else:
            deduped[row_id] = row
    return list(deduped.values()) + passthrough


def fetch_candidates_for_seats(
    seat_ids: Iterable[int],
    timeout: int,
    sleep_seconds: float,
    max_workers: int,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    def fetch_for_seat(seat_id: int) -> List[Dict[str, Any]]:
        url = CANDIDATES_ENDPOINT.format(seat_id=seat_id)
        payload = fetch_json(url, timeout)
        out: List[Dict[str, Any]] = []
        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    out.append({"requested_seat_id": seat_id, **item})
        if sleep_seconds > 0:
            time.sleep(sleep_seconds)
        return out

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(fetch_for_seat, seat_id): seat_id for seat_id in seat_ids}
        for future in as_completed(futures):
            seat_id = futures[future]
            try:
                rows.extend(future.result())
            except requests.RequestException as exc:
                print(f"Seat {seat_id}: candidate request error: {exc}")
            except Exception as exc:
                print(f"Seat {seat_id}: unexpected candidate error: {exc}")

    return rows


def fetch_home_results(timeout: int) -> List[Dict[str, Any]]:
    payload = fetch_json(HOME_RESULTS_ENDPOINT, timeout)
    if not isinstance(payload, list):
        return []

    rows: List[Dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        rows.append(item)
    return rows


def expand_home_result_candidates(home_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    expanded: List[Dict[str, Any]] = []
    for row in home_rows:
        seat_no = row.get("seat_no")
        candidates_blob = row.get("candidates")
        if not candidates_blob:
            continue

        parsed: Any
        try:
            if isinstance(candidates_blob, str):
                parsed = json.loads(candidates_blob)
            else:
                parsed = candidates_blob
        except json.JSONDecodeError:
            continue

        if not isinstance(parsed, list):
            continue

        for candidate in parsed:
            if not isinstance(candidate, dict):
                continue
            expanded.append({"seat_no": seat_no, **candidate})

    return expanded


def write_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        print(f"No rows to write for: {path}")
        return

    fieldnames = sorted({key for row in rows for key in row.keys()})
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved CSV: {path} ({len(rows)} rows)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Dhaka Tribune homepage-backed seats and candidate data to CSV."
    )
    parser.add_argument(
        "--out-dir",
        default=os.path.join("data_science", "data", "raw", "news_scrape"),
        help="Directory where CSV files are saved.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Request timeout in seconds.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Per-request delay in seconds for candidate endpoint calls.",
    )
    parser.add_argument(
        "--max-workers",
        type=int,
        default=16,
        help="Number of concurrent workers for candidate endpoint requests.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    date_stamp = dt.date.today().isoformat()

    seats_rows = fetch_seats(DEFAULT_DIVISION_IDS, timeout=args.timeout)
    seat_ids = [int(row["id"]) for row in seats_rows if isinstance(row.get("id"), int)]

    candidates_rows = fetch_candidates_for_seats(
        seat_ids=seat_ids,
        timeout=args.timeout,
        sleep_seconds=args.sleep,
        max_workers=args.max_workers,
    )

    home_rows = fetch_home_results(timeout=args.timeout)
    home_candidate_vote_rows = expand_home_result_candidates(home_rows)

    write_csv(
        os.path.join(args.out_dir, f"dhaka_tribune_seats_raw_{date_stamp}.csv"),
        seats_rows,
    )
    write_csv(
        os.path.join(args.out_dir, f"dhaka_tribune_candidates_raw_{date_stamp}.csv"),
        candidates_rows,
    )
    write_csv(
        os.path.join(args.out_dir, f"dhaka_tribune_home_results_raw_{date_stamp}.csv"),
        home_rows,
    )
    write_csv(
        os.path.join(args.out_dir, f"dhaka_tribune_home_candidate_votes_raw_{date_stamp}.csv"),
        home_candidate_vote_rows,
    )


if __name__ == "__main__":
    main()
