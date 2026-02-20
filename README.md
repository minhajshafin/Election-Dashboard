# Election Dashboard

## Run the scraper

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

