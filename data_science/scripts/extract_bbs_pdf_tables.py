#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber


# Only use line-based detection.
# The text strategy splits words across columns whenever character spacing varies
# (e.g. "National" → "N" + "ational", "52.64" → "52." + "64"), making the output
# unusable.  Line-based detection follows actual drawn table borders.
TABLE_SETTINGS = {"vertical_strategy": "lines", "horizontal_strategy": "lines"}

PLAN_KEYWORDS = [
    "literacy",
    "poverty",
    "income",
    "household",
    "population density",
    "urban",
    "rural",
    "employment",
    "unemployment",
    "internet",
    "electricity",
    "access to electricity",
    "labour",
    "labor",
]


@dataclass
class TableExtractionRecord:
    source_pdf: str
    page: int
    table_index: int
    rows: int
    columns: int
    method: str
    matched_keywords: str
    csv_path: str


@dataclass
class ExtractedTable:
    columns: list[str] | None
    rows: list[list[str]]

    @property
    def row_count(self) -> int:
        return len(self.rows)

    @property
    def column_count(self) -> int:
        if self.columns:
            return len(self.columns)
        return len(self.rows[0]) if self.rows else 0

    def signature(self) -> str:
        lines: list[str] = []
        if self.columns:
            lines.append("|".join(self.columns))
        lines.extend("|".join(row) for row in self.rows)
        return "\n".join(lines)


def normalize_cell(value: object) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def clean_raw_table(raw_table: list[list[object]]) -> list[list[str]]:
    cleaned = [[normalize_cell(cell) for cell in row] for row in raw_table]
    cleaned = [row for row in cleaned if any(cell for cell in row)]
    if not cleaned:
        return []

    max_cols = max(len(row) for row in cleaned)
    normalized_rows = [row + [""] * (max_cols - len(row)) for row in cleaned]

    keep_col_indices = [
        col_index
        for col_index in range(max_cols)
        if any(row[col_index] for row in normalized_rows)
    ]

    return [[row[col] for col in keep_col_indices] for row in normalized_rows]


def is_numeric_like(value: str) -> bool:
    cleaned = value.replace(",", "").replace(".", "")
    return bool(cleaned) and cleaned.isdigit()


def build_table(table_rows: list[list[str]]) -> ExtractedTable | None:
    if len(table_rows) <= 1:
        return None

    first_row = table_rows[0]
    second_row = table_rows[1]
    non_empty_first = sum(1 for value in first_row if value)
    numeric_ratio_first = sum(is_numeric_like(value) for value in first_row) / max(
        non_empty_first, 1
    )
    non_empty_second = sum(1 for value in second_row if value)
    numeric_ratio_second = sum(is_numeric_like(value) for value in second_row) / max(
        non_empty_second, 1
    )

    header_like = non_empty_first >= 2 and numeric_ratio_first < 0.45 and numeric_ratio_second >= numeric_ratio_first

    if header_like:
        columns = []
        used = {}
        for index, name in enumerate(first_row, start=1):
            base_name = name or f"col_{index}"
            if base_name in used:
                used[base_name] += 1
                base_name = f"{base_name}_{used[base_name]}"
            else:
                used[base_name] = 1
            columns.append(base_name)
        return ExtractedTable(columns=columns, rows=table_rows[1:])

    return ExtractedTable(columns=None, rows=table_rows)


def is_data_table(table: ExtractedTable) -> bool:
    """Return False for paragraph text that pdfplumber mis-detects as a table.

    Paragraphs squeezed between table borders show up as 1-2 column "tables"
    whose cells contain long prose sentences.  Real data tables have ≥3 columns
    or at least 40 % short / numeric cells.
    """
    if table.column_count >= 3:
        return True
    all_cells: list[str] = []
    if table.columns:
        all_cells.extend(table.columns)
    for row in table.rows:
        all_cells.extend(row)
    non_empty = [c for c in all_cells if c]
    if not non_empty:
        return False
    short_or_numeric = sum(1 for c in non_empty if len(c) <= 40 or is_numeric_like(c.replace(" ", "").replace(".", "").replace(",", "")))
    return short_or_numeric / len(non_empty) >= 0.4


def collect_matched_keywords(table: ExtractedTable, keywords: list[str]) -> list[str]:
    haystack_parts: list[str] = []
    if table.columns:
        haystack_parts.extend(table.columns)
    for row in table.rows:
        haystack_parts.extend(row)
    haystack = " ".join(haystack_parts).lower()
    return [keyword for keyword in keywords if keyword.lower() in haystack]


def write_table_csv(table: ExtractedTable, output_path: Path) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        if table.columns:
            writer.writerow(table.columns)
        writer.writerows(table.rows)


def page_raw_tables(page: object) -> list[list[list[object]]]:
    """Return raw tables using line-border detection only."""
    try:
        return page.extract_tables(table_settings=TABLE_SETTINGS) or []
    except Exception:
        return []


def extract_tables_from_pdf(
    pdf_path: Path,
    output_tables_dir: Path,
    keywords: list[str],
    only_relevant: bool,
) -> list[TableExtractionRecord]:
    records: list[TableExtractionRecord] = []
    seen_signatures: set[str] = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            for table_num, raw_rows in enumerate(page_raw_tables(page), start=1):
                cleaned_rows = clean_raw_table(raw_rows)
                if len(cleaned_rows) < 2:
                    continue

                table = build_table(cleaned_rows)
                if not table or table.row_count == 0:
                    continue

                if not is_data_table(table):
                    continue

                matched_keywords = collect_matched_keywords(table, keywords)
                if only_relevant and not matched_keywords:
                    continue

                signature = table.signature()
                if signature in seen_signatures:
                    continue
                seen_signatures.add(signature)

                output_name = f"{pdf_path.stem}_p{page_num:03d}_t{len(records)+1:03d}.csv"
                output_path = output_tables_dir / output_name
                write_table_csv(table, output_path)

                records.append(
                    TableExtractionRecord(
                        source_pdf=pdf_path.name,
                        page=page_num,
                        table_index=table_num,
                        rows=table.row_count,
                        columns=table.column_count,
                        method="lines",
                        matched_keywords=";".join(matched_keywords),
                        csv_path=str(output_path),
                    )
                )

    return records


def find_pdfs(input_dir: Path) -> Iterable[Path]:
    return sorted(path for path in input_dir.glob("*.pdf") if path.is_file())


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract tables from BBS PDF reports into CSV files")
    parser.add_argument(
        "--input-dir",
        default="data_science/data/raw/BBS (Bangladesh Bureau of Statistics)",
        help="Directory containing source PDF files",
    )
    parser.add_argument(
        "--output-dir",
        default="data_science/data/processed/bbs_tables",
        help="Directory for extracted CSV tables and manifest",
    )
    parser.add_argument(
        "--keywords",
        default=",".join(PLAN_KEYWORDS),
        help="Comma-separated keywords used to keep only plan-relevant tables",
    )
    parser.add_argument(
        "--include-all",
        action="store_true",
        help="Include all extracted tables (disables relevance filtering)",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_tables_dir = output_dir / "tables"
    output_tables_dir.mkdir(parents=True, exist_ok=True)
    keywords = [keyword.strip().lower() for keyword in args.keywords.split(",") if keyword.strip()]
    only_relevant = not args.include_all

    pdf_files = list(find_pdfs(input_dir))
    if not pdf_files:
        raise SystemExit(f"No PDF files found in: {input_dir}")

    all_records: list[TableExtractionRecord] = []
    for pdf_path in pdf_files:
        records = extract_tables_from_pdf(
            pdf_path=pdf_path,
            output_tables_dir=output_tables_dir,
            keywords=keywords,
            only_relevant=only_relevant,
        )
        all_records.extend(records)

    manifest_path = output_dir / "table_extraction_manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as manifest_file:
        writer = csv.DictWriter(
            manifest_file,
            fieldnames=[
                "source_pdf",
                "page",
                "table_index",
                "rows",
                "columns",
                "method",
                "matched_keywords",
                "csv_path",
            ],
        )
        writer.writeheader()
        for record in all_records:
            writer.writerow(record.__dict__)

    print(f"Processed PDF files: {len(pdf_files)}")
    print(f"Filtering mode: {'plan-relevant only' if only_relevant else 'all tables'}")
    print(f"Extracted tables: {len(all_records)}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()