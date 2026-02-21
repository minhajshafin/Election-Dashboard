# Bangladesh National Election 2026 – Big Data Correlation & Predictive Analytics

## 1. Project Overview

A big data analytics project that analyzes the Bangladesh National Election 2026 results and investigates the relationship between election outcomes and socio-economic factors. The project uses **Apache Spark** for large-scale data processing, **Spark MLlib** for correlation analysis, regression, classification, and clustering, and a **Next.js dashboard** for interactive visualization of findings

### Run the scraper

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r data_science/requirements.txt
python data_science/scrape_election_results.py
```

If VS Code runs with a different interpreter, use the workspace venv explicitly:

```bash
/home/billy/X/Election-Dashboard/.venv/bin/python data_science/scrape_election_results.py
```

