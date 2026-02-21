#!/usr/bin/env python3
"""Fetch HDX socioeconomic source data for Bangladesh election analysis."""

from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

DEFAULT_TIMEOUT = 60
DOWNLOADABLE_EXTENSIONS = {
    ".csv",
    ".xlsx",
}

BANGLADESH_MARKERS = {
    "bangladesh",
    "bgd",
}

TARGET_TOPIC_MARKERS = {
    "population",
    "demograph",
    "age",
    "sex",
    "gender",
    "education",
    "literacy",
    "school",
    "income",
    "poverty",
    "consumption",
    "religion",
    "ethnicity",
}

EXCLUDED_TOPIC_MARKERS = {
    "malaria",
    "tuberculosis",
    "tb",
    "hiv",
    "aids",
    "cholera",
    "covid",
    "coronavirus",
    "ebola",
    "dengue",
    "measles",
    "vaccin",
    "outbreak",
    "conflict",
    "earthquake",
    "cyclone",
    "flood",
}


@dataclass
class DownloadResult:
    source: str
    query: str
    dataset_title: str | None
    url: str
    status: str
    local_path: str | None = None
    message: str | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_filename(name: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "_", name).strip("_")
    return value or "download"


def is_downloadable_link(url: str) -> bool:
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    return suffix in DOWNLOADABLE_EXTENSIONS


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def build_dataset_search_text(dataset: dict) -> str:
    parts: list[str] = [
        str(dataset.get("title") or ""),
        str(dataset.get("name") or ""),
        str(dataset.get("notes") or ""),
    ]

    for tag in dataset.get("tags", []) or []:
        if isinstance(tag, dict):
            parts.append(str(tag.get("name") or ""))
            parts.append(str(tag.get("display_name") or ""))

    for group in dataset.get("groups", []) or []:
        if isinstance(group, dict):
            parts.append(str(group.get("name") or ""))
            parts.append(str(group.get("title") or ""))

    organization = dataset.get("organization")
    if isinstance(organization, dict):
        parts.append(str(organization.get("name") or ""))
        parts.append(str(organization.get("title") or ""))

    return normalize_text(" ".join(parts))


def dataset_is_relevant(dataset: dict) -> tuple[bool, str | None]:
    text = build_dataset_search_text(dataset)

    if not any(marker in text for marker in BANGLADESH_MARKERS):
        return False, "not-bangladesh"

    if any(marker in text for marker in EXCLUDED_TOPIC_MARKERS):
        return False, "excluded-topic"

    if not any(marker in text for marker in TARGET_TOPIC_MARKERS):
        return False, "non-target-topic"

    return True, None


def download_file(
    session: requests.Session,
    url: str,
    destination_dir: Path,
    dry_run: bool,
    max_file_mb: int,
    timeout: int,
) -> tuple[str, str | None, str | None]:
    ensure_dir(destination_dir)
    parsed = urlparse(url)
    raw_name = Path(parsed.path).name or "download"
    file_name = sanitize_filename(raw_name)
    target_path = destination_dir / file_name

    if dry_run:
        return "discovered", str(target_path), "Dry-run mode: file not downloaded."

    max_bytes = max_file_mb * 1024 * 1024

    try:
        with session.get(url, stream=True, timeout=timeout) as response:
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "")
            content_length_header = response.headers.get("Content-Length")
            if content_length_header:
                try:
                    content_length = int(content_length_header)
                    if content_length > max_bytes:
                        return (
                            "skipped",
                            None,
                            (
                                f"File too large ({content_length / (1024 * 1024):.1f} MB); "
                                f"limit is {max_file_mb} MB."
                            ),
                        )
                except ValueError:
                    pass

            if "text/html" in content_type and not is_downloadable_link(url):
                return "skipped", None, "Looks like HTML page, not a direct file."

            with target_path.open("wb") as handle:
                downloaded_bytes = 0
                for chunk in response.iter_content(chunk_size=1024 * 256):
                    if not chunk:
                        continue
                    downloaded_bytes += len(chunk)
                    if downloaded_bytes > max_bytes:
                        handle.close()
                        target_path.unlink(missing_ok=True)
                        return (
                            "skipped",
                            None,
                            f"Partial download exceeded {max_file_mb} MB limit; aborted.",
                        )
                    handle.write(chunk)

        return "downloaded", str(target_path), None
    except requests.RequestException as exc:
        return "failed", None, str(exc)


def search_hdx_resources(
    session: requests.Session,
    query: str,
    rows: int,
    timeout: int,
) -> list[dict]:
    api_url = "https://data.humdata.org/api/3/action/package_search"
    params = {"q": query, "rows": rows}
    response = session.get(api_url, params=params, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("success"):
        return []
    return payload.get("result", {}).get("results", [])


def collect_hdx(
    session: requests.Session,
    destination_root: Path,
    timeout: int,
    rows: int,
    max_files: int,
    dry_run: bool,
    max_file_mb: int,
    queries: list[str],
) -> list[DownloadResult]:
    destination = destination_root / "HDX"
    ensure_dir(destination)

    results: list[DownloadResult] = []
    seen_urls: set[str] = set()
    collected_count = 0

    for query in queries:
        try:
            datasets = search_hdx_resources(session, query, rows=rows, timeout=timeout)
        except requests.RequestException as exc:
            results.append(
                DownloadResult(
                    source="HDX",
                    query=query,
                    dataset_title=None,
                    url="https://data.humdata.org/",
                    status="failed",
                    message=f"HDX API request failed: {exc}",
                )
            )
            continue

        for dataset in datasets:
            is_relevant, _ = dataset_is_relevant(dataset)
            if not is_relevant:
                continue

            dataset_title = dataset.get("title") or dataset.get("name") or "unknown_dataset"
            resources = dataset.get("resources", [])
            for resource in resources:
                if collected_count >= max_files:
                    break

                url = resource.get("url") or ""
                if not url or url in seen_urls:
                    continue
                if not is_downloadable_link(url):
                    continue

                resource_name = normalize_text(
                    str(resource.get("name") or resource.get("description") or resource.get("format") or "")
                )
                if resource_name and any(marker in resource_name for marker in EXCLUDED_TOPIC_MARKERS):
                    continue

                seen_urls.add(url)
                status, local_path, message = download_file(
                    session=session,
                    url=url,
                    destination_dir=destination,
                    dry_run=dry_run,
                    max_file_mb=max_file_mb,
                    timeout=timeout,
                )
                results.append(
                    DownloadResult(
                        source="HDX",
                        query=query,
                        dataset_title=dataset_title,
                        url=url,
                        status=status,
                        local_path=local_path,
                        message=message,
                    )
                )

                if status in {"downloaded", "discovered"}:
                    collected_count += 1
                time.sleep(0.12)

            if collected_count >= max_files:
                break

        if collected_count >= max_files:
            break

    if not results:
        results.append(
            DownloadResult(
                source="HDX",
                query="",
                dataset_title=None,
                url="https://data.humdata.org/",
                status="manual-required",
                message="No matching downloadable resources found from API search.",
            )
        )

    return results


def write_manifest(path: Path, payload: dict) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch HDX datasets for Bangladesh analysis.")
    parser.add_argument(
        "--output-root",
        default="data_science/data/raw",
        help="Root folder where HDX downloads are stored.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="HTTP timeout in seconds.",
    )
    parser.add_argument(
        "--hdx-rows",
        type=int,
        default=12,
        help="How many HDX datasets to inspect per query.",
    )
    parser.add_argument(
        "--max-hdx-files",
        type=int,
        default=25,
        help="Maximum number of HDX resource files to fetch/discover.",
    )
    parser.add_argument(
        "--max-file-mb",
        type=int,
        default=200,
        help="Skip files larger than this size in MB.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Discover links and write manifest without downloading file content.",
    )
    parser.add_argument(
        "--queries",
        nargs="+",
        default=[
            "bangladesh population",
            "bangladesh age sex",
            "bangladesh education",
            "bangladesh literacy",
            "bangladesh household income",
            "bangladesh religion",
            "bangladesh census",
        ],
        help="HDX search queries.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    session = make_session()

    run_started = now_iso()

    results = collect_hdx(
        session=session,
        destination_root=output_root,
        timeout=args.timeout,
        rows=args.hdx_rows,
        max_files=args.max_hdx_files,
        dry_run=args.dry_run,
        max_file_mb=args.max_file_mb,
        queries=args.queries,
    )

    run_finished = now_iso()

    manifest_path = output_root / "source_acquisition_manifest.json"
    payload = {
        "generated_at_utc": run_finished,
        "run_started_utc": run_started,
        "mode": "HDX-only",
        "output_root": str(output_root),
        "downloads": [
            {
                "source": item.source,
                "query": item.query,
                "dataset_title": item.dataset_title,
                "url": item.url,
                "status": item.status,
                "local_path": item.local_path,
                "message": item.message,
            }
            for item in results
        ],
    }
    write_manifest(manifest_path, payload)

    total = len(results)
    downloaded = sum(1 for item in results if item.status == "downloaded")
    discovered = sum(1 for item in results if item.status == "discovered")
    failed = sum(1 for item in results if item.status == "failed")
    skipped = sum(1 for item in results if item.status == "skipped")
    manual_required = sum(1 for item in results if item.status == "manual-required")

    print("HDX acquisition finished.")
    print(f"Manifest: {manifest_path}")
    print(
        "Summary -> "
        f"total={total}, downloaded={downloaded}, discovered={discovered}, "
        f"failed={failed}, skipped={skipped}, manual_required={manual_required}"
    )


if __name__ == "__main__":
    main()
