<div align="center">

# 🇧🇩 Bangladesh National Election Dashboard 2026

[![Vercel Deploy](https://img.shields.io/badge/Vercel-Live-00DC82?logo=vercel&logoColor=white&style=flat-square)](https://bd-election-dashboard.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&style=flat-square)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?logo=react&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white&style=flat-square)](https://www.python.org/)
[![Spark](https://img.shields.io/badge/Apache_Spark-MLlib-E25A1C?logo=apachespark&logoColor=white&style=flat-square)](https://spark.apache.org/)

**Data journalism meets machine learning** — An interactive platform for exploring the Bangladesh National Election 2026 through constituency-level outcomes and socio-economic indicators, engineered with production constraints, full mobile responsiveness, and high-performance geospatial cartography.

### [🚀 **Visit Live Dashboard**](https://bd-election-dashboard.vercel.app) · [📖 Full Setup](build.md) · [📋 Architecture](docs/dashboard-plan.md)

<br>

### 🖥️ Desktop Layout
<p align="center">
  <img src="screenshots/desktop_layout.png" alt="Desktop Layout" width="100%">
</p>
<p align="center">
  <em>Desktop Layout</em> — 3-column synchronized layout featuring administrative division tabs, interactive Leaflet constituency map with party color legend, 300-seat directory list, and real-time constituency inspector.
</p>

<br>

### 📱 Mobile-Optimized Responsive Layout
<table align="center" border="0">
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/mobile_layout.png" alt="Mobile Dashboard Layout" width="340"><br><br>
      <b>📱 Mobile View — Dual Cascading Dropdowns &amp; Fluid Map</b><br>
      <sub>Streamlined mobile navigation, Election/Referendum toggle, custom cascading division &amp; constituency dropdowns with live party status dots, responsive touch map canvas, and details inspector positioned naturally below.</sub>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/mobile_search.png" alt="Mobile Search &amp; Autocomplete" width="340"><br><br>
      <b>🔍 Mobile View — Live Search &amp; Autocomplete Popover</b><br>
      <sub>Floating autocomplete listbox (<code>z-[2000]</code>) over Leaflet canvas, displaying matching seats with party dots, constituency name, district/division metadata, vote shares, quick division jump, and map highlighting.</sub>
    </td>
  </tr>
</table>

</div>

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Constituencies** | 300 seats analyzed |
| **Data Points** | 19 socio-economic indicators |
| **ML Models** | Correlation, Regression, Classification, Clustering |
| **Data Coverage Guardrail** | 300/300 constituency validation before export |
| **Response Time** | <100ms static prerender |
| **Responsive Design** | Full desktop (3-column) & mobile viewport support |
| **Deployment** | Vercel (production-ready) |

## 🧭 Engineering Signals

This repository is designed to be easy to evaluate from both product and engineering perspectives:

- **Clear system boundaries** between ingestion, feature generation, and UI contracts
- **Schema-adapter pattern** to absorb upstream data drift without breaking frontend code
- **Reproducible analytics workflow** using Spark MLlib + deterministic export artifacts
- **Mobile-First Responsive Engineering** with dual cascading dropdowns, fluid SVG chart layouts, and touch-optimized viewports
- **Smart Geospatial Search** with real-time division and seat boundary highlighting, camera fly-to, and non-blocking autocomplete
- **Deployment-first architecture** with static prerendering and CDN-friendly assets

## ✨ What This Does

> **Interactive exploration → Instant insights.** Click a constituency on the map or search by name. See election results, socio-economic breakdown, and ML-powered predictions instantly. No loading screens. No code required.

### Core Capabilities at a Glance

<table>
<tr>
<td width="50%">

🗺️ **Interactive Maps & Geospatial Search**
- 300 constituencies rendered in real-time
- Division and seat search query highlighting
- Automatic camera zoom to matched division or seat polygon
- Live party alliance colors and referendum overlay

</td>
<td width="50%">

📱 **Full Mobile Optimization**
- Dual cascading custom dropdowns with party status dots
- Floating autocomplete suggestions list with instant selection
- Fluid map canvas with details inspector stacked underneath
- Touch-friendly controls with no unwanted auto-scrolling

</td>
</tr>
<tr>
<td width="50%">

📈 **Analytics & Modeling**
- 9×9 Pearson & Spearman correlation heatmaps with sticky feature column
- Turnout regression model ($R^2 = 0.47$) with ranked coefficients
- Random Forest party classification with fluid confusion matrix

</td>
<td width="50%">

🎯 **Constituency Clustering**
- K-Means constituency segmentation
- Responsive radar charts & archetype profile cards
- Electoral pattern discovery across demographic variables

</td>
</tr>
</table>

## 🎯 Getting Started

### Option 1: Try Live (Recommended)

**No setup required.** Visit → [National Election Dashboard](https://bd-election-dashboard.vercel.app/)

1. Click a constituency on the map or type in the search bar
2. Explore analysis views (Overview, Correlation, Regression, Classification, Clusters)
3. Search and filter across all 300 seats on mobile or desktop

### Option 2: Run Locally

```bash
git clone <your-repo-url> && cd Election-Dashboard
npm --prefix frontend install && npm --prefix frontend run dev
```

Open `http://localhost:3000` → ready to explore.

**Need help?** See [build.md](build.md) for complete setup + troubleshooting.

## 🏗️ Architecture

The project follows a clean **data-to-UI pipeline**:

```
Raw Election Data + Socio-Economic Indicators
    ⬇️
Spark MLlib Analytics (Correlation, Regression, Classification, Clustering)
    ⬇️
build_frontend_data.py (Data Adapter)
    ⬇️
frontend/public/data/*.json (Stable Contracts)
    ⬇️
frontend/types/api.ts (TypeScript Types)
    ⬇️
Next.js Components (Deployment-Ready UI)
```

**Key principle:** UI components never depend on raw source schemas. Data shape adaptation is centralized in one adapter script, preventing cascading failures and making deployments predictable.

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 • React 19 • TypeScript 5 • Tailwind CSS v4 |
| **Responsive Design** | Mobile-first UX • Dual cascading dropdowns • Sticky feature ribbons |
| **Visualization** | Leaflet • React Leaflet • SVG Charts |
| **Backend Data** | Python • Spark MLlib • Pandas |
| **Deployment** | Vercel • GitHub Actions • Static pre-render |

## 🔍 Featured Pages

| Route | Purpose | Mobile Support |
|-------|---------|:--------------:|
| `/` | Landing map + seat drill-down + live search autocomplete | ✅ Full |
| `/analysis/overview` | National summary stats and fluid 8-division distribution charts | ✅ Full |
| `/analysis/correlation` | Pearson/Spearman heatmap with sticky feature column | ✅ Full |
| `/analysis/regression` | Turnout prediction model insights & coefficients | ✅ Full |
| `/analysis/classification` | Party prediction with fluid confusion matrix | ✅ Full |
| `/analysis/clusters` | Constituency segmentation + archetype radar profiles | ✅ Full |

## 💡 Why This Project Stands Out

> A production-grade data journalism platform that doesn't compromise on rigor.

✅ **End-to-End Ownership** — Data collection, cleaning, modeling, adaptation, and frontend delivery in one coherent pipeline  
✅ **Mobile-Responsive Polish** — Tailored desktop 3-column command center and flowing mobile UI with zero clipped elements  
✅ **Type-Safe Contracts** — TypeScript interfaces isolate UI behavior from source volatility  
✅ **Model Transparency** — Correlation matrices, coefficients, and feature importance are exposed directly in the product  
✅ **Operational Guardrails** — Constituency completeness checks prevent silent data regressions  
✅ **Performance by Design** — Static pre-rendering and optimized data contracts keep interactions near-instant  

## 📦 Data Layer

Frontend consumes 6 stable JSON files from `frontend/public/data/`:

```
constituencies.json       → All 300 seats + metadata
summary.json             → National totals + party stats
correlation.json         → Feature correlation matrices
regression.json          → Turnout model coefficients
classification.json      → Party prediction importance
clusters.json            → Cluster profiles + assignments
```

**Why this design?** Decouples data from UI entirely. If raw sources change, only the adapter script needs updating—zero UI impact.

## 🚀 Deployment

Live on **Vercel** with:
- Static page generation for instant loads
- Automatic deployments on git push
- Sub-100ms API responses
- CDN-cached GeoJSON and analytics files

Deploy your own fork in <2 minutes using [Vercel](https://vercel.com/).

## 🧩 Scope of Work

The implementation spans the full lifecycle rather than a single layer:

- Data ingestion from heterogeneous public sources
- Cleaning and harmonization of election + socio-economic datasets
- ML analysis pipeline (correlation, regression, classification, clustering)
- Data-contract shaping for frontend stability
- Interactive map and analytics experience in Next.js
- Mobile-first responsive optimization and smart geospatial autocomplete
- Production deployment and iterative refinements

## 🤝 Contributing

We welcome contributions. To keep the project clean:

- Keep changes scoped and focused
- Maintain the data-contract boundary between `data_science/` and `frontend/`
- Document new assumptions
- Test locally before pushing

## 📚 Academic Context

This project fulfills **CSE488: Big Data Analytics** (Spring 2026) term-project objectives:

- ✅ Distributed data processing with Apache Spark
- ✅ Heterogeneous dataset integration and joining
- ✅ Spark MLlib for correlation, regression, classification, clustering
- ✅ Interactive visualization of findings
- ✅ Socio-political interpretation of results

## 🙏 Credits

- **Bangladesh Election Commission** for public election data
- **Bangladesh Bureau of Statistics** for socio-economic indicators  
- **OpenStreetMap** community for geographic data
- **Vercel** for production infrastructure

<div align="center">

**Made with ❤️ for data-driven insights**

[🚀 Visit Live Dashboard](https://bd-election-dashboard.vercel.app/) • [📖 Setup Guide](build.md)

</div>
