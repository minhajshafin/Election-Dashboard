# Bangladesh National Election 2026 – Big Data Correlation & Predictive Analytics

## 1. Project Overview

A big data analytics project that analyzes the Bangladesh National Election 2026 results and investigates the relationship between election outcomes and socio-economic factors. The project uses **Apache Spark** for large-scale data processing, **Spark MLlib** for correlation analysis, regression, classification, and clustering, and a **Next.js dashboard** for interactive visualization of findings

### Run the scraper

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r data_science/requirements.txt
python data_science/scripts/scrape_election_results.py
```

If VS Code runs with a different interpreter, use the workspace venv explicitly:

```bash
Election-Dashboard/.venv/bin/python data_science/scripts/scrape_election_results.py
```

### Fetch socioeconomic source data

Run the acquisition script to fetch HDX datasets and generate an acquisition manifest:

```bash
Election-Dashboard/.venv/bin/python data_science/scripts/fetch_socioeconomic_sources.py --dry-run
```

Then run full HDX download when ready:

```bash
Election-Dashboard/.venv/bin/python data_science/scripts/fetch_socioeconomic_sources.py
```

Outputs are written under `data_science/data/raw/HDX/` and include
`source_acquisition_manifest.json` with per-resource status.

### Extract BBS PDF tables to CSV

Use the PDF extraction script to convert tabular content from BBS reports into CSV files:

```bash
Election-Dashboard/.venv/bin/python data_science/scripts/extract_bbs_pdf_tables.py
```

Optional custom paths:

```bash
Election-Dashboard/.venv/bin/python data_science/scripts/extract_bbs_pdf_tables.py \
	--input-dir "data_science/data/raw/BBS (Bangladesh Bureau of Statistics)" \
	--output-dir "data_science/data/processed/bbs_tables"
```

The script writes individual table CSVs to `data_science/data/processed/bbs_tables/tables/`
and a summary file `table_extraction_manifest.csv`.

By default it keeps only plan-relevant socio-economic tables (literacy, poverty,
income/household, population density, urban/rural, employment, internet,
electricity). Use `--include-all` to export every detected table.

