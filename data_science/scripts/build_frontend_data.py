#!/usr/bin/env python3
"""Build stable frontend JSON datasets from Spark output artifacts."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0.0"

REFERENDUM_SOURCE_PATTERNS = [
    "dhaka_tribune_referendum_raw_*.csv",
    "dhaka_tribune_seats_raw_*.csv",
]

GEO_NAME_REPLACEMENTS = {
    "Barisal ": "Barishal ",
    "Bogra ": "Bogura ",
    "Chapai Nababganj ": "Chapainawabganj ",
    "Chapainababganj ": "Chapainawabganj ",
    "Chittagong ": "Chattogram ",
    "Comilla ": "Cumilla ",
    "Jessore ": "Jashore ",
    "Cox's Bazar ": "Coxs Bazar ",
    "Cox’s Bazar ": "Coxs Bazar ",
    "Cox?s Bazar ": "Coxs Bazar ",
    "Maulvibazar ": "Moulvibazar ",
}

GEO_NAME_EXACT_REPLACEMENTS = {
    "Parbatya Bandarban": "Bandarban 1",
    "Parbatya Khagrachari": "Khagrachhari 1",
    "Parbatya Rangamati": "Rangamati 1",
}

REFERENDUM_NAME_REPLACEMENTS = {
    **GEO_NAME_REPLACEMENTS,
    "Jhalakathi ": "Jhalokathi ",
    "KIshoreganj ": "Kishoreganj ",
    "Netrokona ": "Netrakona ",
}

REFERENDUM_NAME_EXACT_REPLACEMENTS = {
    "Bandarban": "Bandarban 1",
    "Khagrachari": "Khagrachhari 1",
    "Rangamati": "Rangamati 1",
}

INT_FIELDS = {
    "winner_votes",
    "runner_up_votes",
    "total_valid_votes",
    "candidate_count",
    "Population_Total",
    "Household_Total",
    "pop_total_loc",
    "pop_rural",
    "pop_urban",
    "pop_male",
    "pop_female",
    "employed_total",
    "looking_for_work",
    "pop_muslim",
    "pop_hindu",
}

FLOAT_FIELDS = {
    "pop_density",
    "literacy_rate",
    "literacy_male",
    "literacy_female",
    "internet_pct",
    "internet_male_pct",
    "internet_female_pct",
    "mobile_phone_pct",
    "neet_pct",
    "financial_account_pct",
    "sex_ratio",
    "dependency_ratio",
    "turnout_pct",
    "winning_margin_pct",
    "winner_vote_share_pct",
    "urbanization_index",
    "employment_rate_pct",
    "competitiveness_index",
    "muslim_majority_pct",
    "hindu_pct",
    "female_pct",
}

PARTY_ALLIANCE_OVERRIDES = {
    "ncp": "jamaat",
    "national citizens party - ncp": "jamaat",
    "national citizen party (ncp)": "jamaat",
    "bangladesh jatiya party (bjp)": "bnp",
    "bangladesh khilafat majlis": "jamaat",
    "bangladesh khelafat majlish": "jamaat",
    "khilafat majlis": "jamaat",
    "khelafat majlish": "jamaat",
    "gonoshonghoti andolon": "bnp",
    "ganosamhati andolon": "bnp",
    "gono odhikar parishad (gop)": "bnp",
    "gono odhikar parishad": "bnp",
}

SUMMARY_AVERAGE_FIELDS = [
    "turnout_pct",
    "winning_margin_pct",
    "candidate_count",
    "winner_vote_share_pct",
    "literacy_rate",
    "internet_pct",
    "urbanization_index",
    "employment_rate_pct",
    "neet_pct",
    "financial_account_pct",
    "pop_density",
    "dependency_ratio",
    "female_pct",
]


@dataclass(frozen=True)
class ArtifactPaths:
    root: Path
    analytics_csv: Path
    cluster_assignments_csv: Path
    referendum_csv: Path
    classification_json: Path
    regression_json: Path
    cluster_profiles_json: Path
    pearson_csv: Path
    spearman_csv: Path
    geojson: Path
    output_dir: Path


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[2]
    spark_output = root / "data_science" / "data" / "processed" / "spark_output"
    referendum_dir = root / "data_science" / "data" / "raw" / "news_scrape"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=root)
    parser.add_argument("--spark-output", type=Path, default=spark_output)
    parser.add_argument(
        "--referendum-csv",
        type=Path,
        default=None,
        help=(
            "Optional explicit referendum CSV path. If omitted, the newest file matching "
            "dhaka_tribune_referendum_raw_*.csv or dhaka_tribune_seats_raw_*.csv from "
            f"{referendum_dir} is used."
        ),
    )
    parser.add_argument(
        "--geojson",
        type=Path,
        default=root / "frontend" / "public" / "geojson" / "GRED_20190215_Bangladesh_2008.geojson",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=root / "frontend" / "public" / "data",
    )
    parser.add_argument("--competitive-threshold", type=float, default=10.0)
    return parser.parse_args()


def resolve_artifact_paths(args: argparse.Namespace) -> ArtifactPaths:
    return ArtifactPaths(
        root=args.root,
        analytics_csv=find_part_csv(args.spark_output / "analytics_base_csv"),
        cluster_assignments_csv=find_part_csv(args.spark_output / "cluster_assignments_csv"),
        referendum_csv=resolve_referendum_csv(args.root, args.referendum_csv),
        classification_json=args.spark_output / "classification_results.json",
        regression_json=args.spark_output / "regression_results.json",
        cluster_profiles_json=args.spark_output / "cluster_profiles.json",
        pearson_csv=args.spark_output / "pearson_correlation.csv",
        spearman_csv=args.spark_output / "spearman_correlation.csv",
        geojson=args.geojson,
        output_dir=args.output_dir,
    )


def find_part_csv(directory: Path) -> Path:
    matches = sorted(directory.glob("part-*.csv"))
    if not matches:
        raise FileNotFoundError(f"No part-*.csv files found in {directory}")
    return matches[0]


def resolve_referendum_csv(root: Path, explicit_csv: Path | None) -> Path:
    if explicit_csv is not None:
        if not explicit_csv.exists():
            raise FileNotFoundError(f"Referendum CSV not found: {explicit_csv}")
        return explicit_csv

    referendum_dir = root / "data_science" / "data" / "raw" / "news_scrape"
    matches: list[Path] = []
    for pattern in REFERENDUM_SOURCE_PATTERNS:
        matches.extend(referendum_dir.glob(pattern))

    if not matches:
        raise FileNotFoundError(
            "No referendum CSV found. Expected one of: "
            + ", ".join(str(referendum_dir / pattern) for pattern in REFERENDUM_SOURCE_PATTERNS)
        )

    return sorted(matches, key=lambda path: path.stat().st_mtime, reverse=True)[0]


def build_meta(root: Path, source_files: list[Path]) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "source_files": [str(path.relative_to(root)) for path in source_files],
    }


def normalize_constituency_name(
    name: str,
    prefix_replacements: dict[str, str],
    exact_replacements: dict[str, str],
) -> str:
    normalized = " ".join(name.replace("-", " ").split())
    if normalized in exact_replacements:
        return exact_replacements[normalized]
    for old, new in prefix_replacements.items():
        if normalized.startswith(old):
            return normalized.replace(old, new, 1)
    return normalized


def normalize_geo_constituency_name(name: str) -> str:
    return normalize_constituency_name(name, GEO_NAME_REPLACEMENTS, GEO_NAME_EXACT_REPLACEMENTS)


def normalize_referendum_constituency_name(name: str) -> str:
    return normalize_constituency_name(name, REFERENDUM_NAME_REPLACEMENTS, REFERENDUM_NAME_EXACT_REPLACEMENTS)


def normalize_analytics_constituency_name(name: str) -> str:
    return normalize_geo_constituency_name(name)


def load_geo_lookup(geojson_path: Path) -> dict[str, dict[str, Any]]:
    with geojson_path.open(encoding="utf-8") as file_obj:
        payload = json.load(file_obj)

    lookup: dict[str, dict[str, Any]] = {}
    for feature in payload["features"]:
        properties = feature.get("properties", {})
        original_name = str(properties.get("cst_n", "")).strip()
        normalized_name = normalize_geo_constituency_name(original_name)
        lookup[normalized_name] = {
            "geo_name": original_name,
            "geo_code": int(properties["cst"]) if properties.get("cst") is not None else None,
            "country_name": properties.get("ctr_n"),
            "election_year": int(properties["yr"]) if properties.get("yr") is not None else None,
        }
    return lookup


def load_csv_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(encoding="utf-8", newline="") as file_obj:
        return list(csv.DictReader(file_obj))


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as file_obj:
        return json.load(file_obj)


def parse_int(value: str) -> int | None:
    value = (value or "").replace(",", "").strip()
    if not value:
        return None
    return int(float(value))


def parse_float(value: str) -> float | None:
    value = (value or "").replace(",", "").strip()
    if not value:
        return None
    return round(float(value), 4)


def slugify_constituency(name: str) -> str:
    return "-".join(name.lower().split())


def normalize_party_key(name: str) -> str:
    return " ".join(name.lower().split())


def derive_referendum_result(yes_votes: int | None, no_votes: int | None) -> str | None:
    if yes_votes is None or no_votes is None:
        return None
    if yes_votes > no_votes:
        return "yes"
    if no_votes > yes_votes:
        return "no"
    return None


def build_referendum_lookup(referendum_rows: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}

    for row in referendum_rows:
        constituency = normalize_referendum_constituency_name(row.get("seat_name", ""))
        if not constituency:
            continue

        yes_votes = parse_int(row.get("yes", ""))
        no_votes = parse_int(row.get("no", ""))
        referendum_result = derive_referendum_result(yes_votes, no_votes)

        current_value = {
            "referendum_yes": yes_votes,
            "referendum_no": no_votes,
            "referendum_result": referendum_result,
        }

        existing_value = lookup.get(constituency)
        if existing_value is None:
            lookup[constituency] = current_value
            continue

        existing_completeness = int(existing_value["referendum_yes"] is not None) + int(
            existing_value["referendum_no"] is not None
        )
        current_completeness = int(yes_votes is not None) + int(no_votes is not None)
        if current_completeness > existing_completeness:
            lookup[constituency] = current_value

    return lookup


def normalize_row(
    row: dict[str, str],
    geo_lookup: dict[str, dict[str, Any]],
    cluster_lookup: dict[str, int],
    referendum_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    constituency = row["constituency"].strip()
    lookup_constituency = normalize_analytics_constituency_name(constituency)
    geo_ref = geo_lookup.get(lookup_constituency)
    winner_party = row["winner_party"].strip()
    alliance = row["alliance"].strip().lower() or "others"
    winner_party_key = normalize_party_key(winner_party)
    if winner_party_key in PARTY_ALLIANCE_OVERRIDES:
        alliance = PARTY_ALLIANCE_OVERRIDES[winner_party_key]
    referendum_ref = referendum_lookup.get(lookup_constituency)
    cluster_value = cluster_lookup.get(constituency)
    if cluster_value is None:
        cluster_value = cluster_lookup.get(lookup_constituency)

    normalized: dict[str, Any] = {
        "seat_key": slugify_constituency(constituency),
        "constituency": constituency,
        "district": row["district"].strip(),
        "division": row["division"].strip(),
        "alliance": alliance,
        "winner_candidate": row["winner_candidate"].strip(),
        "winner_party": winner_party,
        "runner_up_candidate": row["runner_up_candidate"].strip(),
        "runner_up_party": row["runner_up_party"].strip(),
        "cluster": cluster_value,
        "geo_name": geo_ref["geo_name"] if geo_ref else None,
        "geo_code": geo_ref["geo_code"] if geo_ref else None,
        "referendum_yes": referendum_ref["referendum_yes"] if referendum_ref else None,
        "referendum_no": referendum_ref["referendum_no"] if referendum_ref else None,
        "referendum_result": referendum_ref["referendum_result"] if referendum_ref else None,
    }

    for field, value in row.items():
        if field in normalized or field in {"district", "division", "alliance", "winner_candidate", "winner_party", "runner_up_candidate", "runner_up_party", "constituency"}:
            continue
        if field in INT_FIELDS:
            normalized[field] = parse_int(value)
        elif field in FLOAT_FIELDS:
            normalized[field] = parse_float(value)
        else:
            normalized[field] = value.strip()

    return normalized


def build_cluster_lookup(cluster_rows: list[dict[str, str]]) -> dict[str, int]:
    lookup: dict[str, int] = {}
    for row in cluster_rows:
        constituency = row["constituency"].strip()
        prediction = row.get("prediction", "").strip()
        if constituency and prediction:
            lookup[constituency] = int(prediction)
    return lookup


def average(rows: list[dict[str, Any]], field: str) -> float | None:
    values = [row[field] for row in rows if row.get(field) is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def build_summary(rows: list[dict[str, Any]], competitive_threshold: float) -> dict[str, Any]:
    seats_by_party = Counter(row["winner_party"] for row in rows)
    seats_by_alliance = Counter(row["alliance"] for row in rows)
    seats_by_division: dict[str, Counter[str]] = defaultdict(Counter)
    division_seat_counts: dict[str, int] = Counter(row["division"] for row in rows)

    for row in rows:
        seats_by_division[row["division"]][row["winner_party"]] += 1

    top_party_name, top_party_seats = seats_by_party.most_common(1)[0]
    total_seats = len(rows)
    competitive_count = sum(
        1
        for row in rows
        if row.get("winning_margin_pct") is not None and row["winning_margin_pct"] < competitive_threshold
    )

    party_rankings = [
        {
            "party": party,
            "seat_count": count,
            "seat_share_pct": round((count / total_seats) * 100, 2),
        }
        for party, count in seats_by_party.most_common()
    ]

    divisions = [
        {
            "division": division,
            "seat_count": division_seat_counts[division],
            "parties": dict(sorted(party_counts.items())),
        }
        for division, party_counts in sorted(seats_by_division.items())
    ]

    national_averages = {
        field: average(rows, field)
        for field in SUMMARY_AVERAGE_FIELDS
    }

    return {
        "total_seats": total_seats,
        "top_party": {
            "party": top_party_name,
            "seat_count": top_party_seats,
            "seat_share_pct": round((top_party_seats / total_seats) * 100, 2),
        },
        "competitive_seats": {
            "threshold_pct": competitive_threshold,
            "count": competitive_count,
            "share_pct": round((competitive_count / total_seats) * 100, 2),
        },
        "avg_turnout": national_averages["turnout_pct"],
        "avg_margin": national_averages["winning_margin_pct"],
        "avg_candidate_count": national_averages["candidate_count"],
        "seats_by_party": dict(seats_by_party),
        "seats_by_alliance": dict(seats_by_alliance),
        "seats_by_division": {
            division: dict(sorted(party_counts.items()))
            for division, party_counts in sorted(seats_by_division.items())
        },
        "division_seat_counts": dict(sorted(division_seat_counts.items())),
        "party_rankings": party_rankings,
        "divisions": divisions,
        "national_averages": national_averages,
    }


def build_correlation_payload(pearson_csv: Path, spearman_csv: Path) -> dict[str, Any]:
    pearson_columns, pearson_matrix = read_correlation_matrix(pearson_csv)
    spearman_columns, spearman_matrix = read_correlation_matrix(spearman_csv)
    if pearson_columns != spearman_columns:
        raise ValueError("Pearson and Spearman correlation files have different column sets")
    return {
        "columns": pearson_columns,
        "pearson": pearson_matrix,
        "spearman": spearman_matrix,
    }


def read_correlation_matrix(path: Path) -> tuple[list[str], list[list[float]]]:
    with path.open(encoding="utf-8", newline="") as file_obj:
        reader = csv.reader(file_obj)
        rows = list(reader)
    columns = rows[0][1:]
    matrix = [[round(float(value), 6) for value in row[1:]] for row in rows[1:]]
    return columns, matrix


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file_obj:
        json.dump(payload, file_obj, indent=2, ensure_ascii=True)
        file_obj.write("\n")


def build_frontend_data() -> None:
    args = parse_args()
    paths = resolve_artifact_paths(args)

    analytics_rows = load_csv_rows(paths.analytics_csv)
    cluster_rows = load_csv_rows(paths.cluster_assignments_csv)
    referendum_rows = load_csv_rows(paths.referendum_csv)
    geo_lookup = load_geo_lookup(paths.geojson)
    cluster_lookup = build_cluster_lookup(cluster_rows)
    referendum_lookup = build_referendum_lookup(referendum_rows)

    normalized_rows = [
        normalize_row(row, geo_lookup, cluster_lookup, referendum_lookup)
        for row in analytics_rows
    ]

    analytics_constituencies = {
        normalize_analytics_constituency_name(row["constituency"].strip())
        for row in analytics_rows
    }
    referendum_constituencies = set(referendum_lookup)

    referendum_without_seat_match = sorted(referendum_constituencies - analytics_constituencies)
    if referendum_without_seat_match:
        print(
            "Warning: "
            f"{len(referendum_without_seat_match)} referendum seat names do not match analytics seats: "
            f"{referendum_without_seat_match}"
        )

    seats_without_referendum_row = sorted(analytics_constituencies - referendum_constituencies)
    if seats_without_referendum_row:
        print(
            "Warning: "
            f"{len(seats_without_referendum_row)} analytics seats have no referendum row: "
            f"{seats_without_referendum_row}"
        )

    unmatched_geo = [row["constituency"] for row in normalized_rows if row["geo_name"] is None]
    if unmatched_geo:
        print(f"Warning: {len(unmatched_geo)} constituencies do not match GeoJSON features: {unmatched_geo}")

    missing_clusters = [row["constituency"] for row in normalized_rows if row["cluster"] is None]
    if missing_clusters:
        print(f"Info: {len(missing_clusters)} constituencies have no cluster assignment")

    summary_payload = build_summary(normalized_rows, args.competitive_threshold)
    correlation_payload = build_correlation_payload(paths.pearson_csv, paths.spearman_csv)

    write_json(
        paths.output_dir / "constituencies.json",
        {
            "meta": build_meta(
                paths.root,
                [paths.analytics_csv, paths.cluster_assignments_csv, paths.referendum_csv, paths.geojson],
            ),
            "rows": normalized_rows,
        },
    )
    write_json(
        paths.output_dir / "summary.json",
        {
            "meta": build_meta(paths.root, [paths.analytics_csv, paths.cluster_assignments_csv]),
            "summary": summary_payload,
        },
    )
    write_json(
        paths.output_dir / "correlation.json",
        {
            "meta": build_meta(paths.root, [paths.pearson_csv, paths.spearman_csv]),
            **correlation_payload,
        },
    )
    write_json(
        paths.output_dir / "classification.json",
        {
            "meta": build_meta(paths.root, [paths.classification_json]),
            "result": load_json(paths.classification_json),
        },
    )
    write_json(
        paths.output_dir / "regression.json",
        {
            "meta": build_meta(paths.root, [paths.regression_json]),
            "result": load_json(paths.regression_json),
        },
    )
    write_json(
        paths.output_dir / "clusters.json",
        {
            "meta": build_meta(paths.root, [paths.cluster_profiles_json, paths.cluster_assignments_csv]),
            "profiles": load_json(paths.cluster_profiles_json),
        },
    )

    print(f"Wrote frontend data to {paths.output_dir}")


if __name__ == "__main__":
    build_frontend_data()