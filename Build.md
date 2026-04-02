# Build and Run Guide

This guide is for someone who just downloaded the repository.

## 1. Prerequisites

Install these first:

- Node.js 20+ (LTS recommended)
- npm 10+
- Python 3.10+ (for data scripts)
- `venv` support for Python (usually included with Python)

## 2. Clone and Enter the Project

```bash
git clone <your-repo-url>
cd Election-Dashboard
```

## 3. Frontend Setup (Next.js)

The web app is in the `frontend/` folder.

Install frontend dependencies:

```bash
npm --prefix frontend install
```

Run development server:

```bash
npm --prefix frontend run dev
```

Then open:

- http://localhost:3000

## 4. Production Build (Frontend)

Build:

```bash
npm --prefix frontend run build
```

Start production server:

```bash
npm --prefix frontend run start
```

## 5. Optional: Python/Data-Science Environment

If you want to run data collection/processing scripts:

Create and activate virtual environment from project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r data_science/requirements.txt
```

Example script run:

```bash
python data_science/scripts/scrape_election_results.py
```

Or without activating venv:

```bash
.venv/bin/python data_science/scripts/scrape_election_results.py
```

## 6. Common Command Reference

From project root:

```bash
# frontend
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run start
npm --prefix frontend run lint

# python data scripts (venv active)
python data_science/scripts/fetch_socioeconomic_sources.py
python data_science/scripts/extract_bbs_pdf_tables.py
```

## 7. Troubleshooting

### `npm ERR! enoent ... /Election-Dashboard/package.json`

Cause: Running npm from repo root where there is no root `package.json`.

Fix: Always use `--prefix frontend` from root, or `cd frontend` first.

### `Unable to acquire lock ... frontend/.next/lock`

Cause: Another `next build` is running, or a stale lock file remains.

Fix:

```bash
rm -f frontend/.next/lock
npm --prefix frontend run build
```

### `useSearchParams() should be wrapped in a suspense boundary`

This was already addressed in the current codebase. If it appears again on a platform build, make sure the deployment is using the latest commit.
