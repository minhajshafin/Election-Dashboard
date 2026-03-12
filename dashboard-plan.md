# Bangladesh Election 2026 – Dashboard Plan

## 1. Architecture Overview

```
[DS Raw Outputs]
      │
      ▼
[build_frontend_data.py]          ← single adapter script, the only DS↔FE coupling
      │  writes 6 stable JSON files
      ▼
frontend/public/data/
  ├── constituencies.json           ← all 299 seats, full stats + cluster
  ├── summary.json                  ← national totals, per-party seats, per-division stats
  ├── correlation.json              ← Pearson + Spearman matrices
  ├── classification.json           ← RandomForest metrics + feature importances
  ├── regression.json               ← LinearRegression coefficients + R²/RMSE
  └── clusters.json                 ← KMeans cluster profiles
      │
      ▼
frontend/types/api.ts               ← TypeScript contracts, catches breakage at compile time
      │
      ▼
frontend/lib/data.ts                ← one typed fetch fn per contract
      │
      ▼
UI Components (data-agnostic, fully parameterized)
```

**Rule:** No component ever references a raw DS file path or column name directly.
If DS changes, fix in `build_frontend_data.py` → re-run → done.

---

## 2. Known Data Facts

| Item | Value |
|---|---|
| GeoJSON file | `public/geojson/GRED_20190215_Bangladesh_2008.geojson` |
| GeoJSON features | 300 MultiPolygon constituencies |
| GeoJSON join key | `properties.cst_n` e.g. `"Bagerhat-1"` |
| CSV join key | `constituency` e.g. `"Bagerhat 1"` |
| **Name normalization needed** | hyphen→space, "Barisal"→"Barishal" in adapter script |
| Total seats with data | 299 |
| Divisions | Barisal, Chattogram, Dhaka, Khulna, Mymensingh, Rajshahi, Rangpur, Sylhet |
| Alliances | `bnp`, `jamaat`, `others` |
| Top parties | BNP (207), Jamaat (68), Independent (8), NCP (6), others (16) |
| Correlation features | 19 (rows/cols in Pearson + Spearman CSVs) |
| ML models | RandomForestClassifier (winner_party), LinearRegression (turnout_pct), KMeans (k=2) |

---

## 3. Page Structure

```
/                    ← Landing: interactive split-panel map
/explorer            ← Constituency table with filter/sort
/analysis/overview   ← Summary stats and charts
/analysis/correlation← Pearson / Spearman heatmaps
/analysis/regression ← Turnout model
/analysis/classification← Party prediction model
/analysis/clusters   ← District cluster profiles
```

All analysis routes are accessible from a persistent top nav bar.

---

## 4. Page 1 — Landing (Home: `/`)

### Design Intent
Minimal, fast to scan, and operational from the first second. The landing page should give the user the national picture immediately, then let them drill from division → seat with almost no friction. The map remains central, but the primary interaction model is now synchronized map + searchable seat browser.

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🇧🇩  Bangladesh Election 2026                 [Explorer] [Analysis ▾]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Summary Strip                                                       │
│  [Total Seats] [Top Party] [Avg Turnout] [Avg Margin] [Competitive Seats]│
├───────────────────────────────────┬─────────────────────────────────────────┤
│                                   │ Search: [ seat / district / division ] │
│         Bangladesh Map            ├──────────────┬──────────────┬──────────┤
│         (left ~55% width)         │ Divisions    │ Seats        │ Details  │
│                                   │ (narrow)     │ (medium)     │ (wide)   │
│  • Full country constituency map  │              │              │          │
│  • Hover tooltip                  │ Barisal      │ Barishal 1   │ Selected │
│  • Click highlights seat          │ Chattogram   │ Barishal 2   │ seat map │
│  • Syncs with right-side browser  │ Dhaka        │ Barishal 3   │ + winner │
│                                   │ ...          │ ...          │ + stats  │
│                                   │              │              │ + socio  │
└───────────────────────────────────┴──────────────┴──────────────┴──────────┘
```

### Top Summary Strip
This is a compact dashboard row above the map section. It should stay visually light, but surface the most important election outcomes immediately.

- `Total Seats` — 299
- `Top Party` — BNP with seat count and seat share
- `Avg Turnout` — national average turnout
- `Avg Margin` — average winning margin
- `Competitive Seats` — seats below a configurable winning-margin threshold, e.g. `<10%`

Each tile should support a tiny secondary line of context, not a full chart. The purpose is orientation, not analysis.

### Map Behavior
- **Color encoding**: one distinct color per alliance (`bnp`=blue, `jamaat`=green, `others`=amber). Optionally toggle to party-level colors via a legend toggle.
- **Hover tooltip** (follows cursor): `Constituency Name · Winner Party · Winner%`
- **Click**: selecting a constituency on the map updates the right-side browser state immediately.
- **Selected state**: the clicked constituency gets a bold white stroke and slightly stronger fill so the selection is obvious.
- **Bidirectional sync**: map selection, division list, seat list, and search results all drive the same `selectedSeatId` state. Selecting from any surface updates every other surface.
- **Zoom**: map starts zoomed to fit all of Bangladesh. User can pan/zoom freely, but seat selection does not force a map zoom reset.
- **Legend**: small floating legend in bottom-left of map showing party→color.
- **Reset behavior**: clicking the map background clears the selected seat but keeps the current division/search context if the user is browsing on the right.
- **Performance rule**: only one seat is rendered as selected at a time; hover state is lightweight and no heavy detail panel recomputation runs until selection changes.

### Right Panel — Search + 3-Column Browser
The right side is no longer a single summary/detail panel. It is a persistent browser made of one search bar and three synchronized columns.

### Search Bar
- Searches constituency name, district/city name, and division name from a single input.
- Results should filter both the division column and the seat column in real time.
- Keyboard support matters: arrow keys move through seats, Enter selects, Escape clears search.
- Debounce input lightly to keep the UI responsive.

### Column 1 — Division List
- Lists all 8 divisions with seat counts.
- Clicking a division filters Column 2 to seats under that division.
- Shows active state clearly.
- Supports a synthetic `All Divisions` item at the top so the user can reset quickly.

### Column 2 — Seat List
- Shows seats under the currently selected division, or all matching seats if search is active.
- Each row should show constituency name and a small metadata line: district + winning party color dot.
- Clicking a seat selects it, highlights it on the left map, and updates Column 3.
- Virtualization should be considered if the list grows, though 299 seats is still manageable without it.

### Column 3 — Selected Seat Details
- **Header**: `Constituency Name` + `District, Division`
- **Mini map**: render only the selected constituency boundary in a small Leaflet view fit to bounds.
- **Winner card**: candidate name, party, alliance, votes, vote share%
- **Runner-up card**: candidate name, party, votes
- **Key stats row**: Turnout%, Margin%, Candidate count, Cluster ID
- **Socioeconomic section**: literacy, internet%, urbanization, employment, NEET%, financial inclusion shown as readable comparison bars vs national average.
- **Empty state**: if nothing is selected, Column 3 shows a short instruction plus a compact national snapshot instead of a full seat detail view.

### Interaction Model
- Map click → highlights seat on map, scrolls the seat into view on the right, activates its division, and loads details.
- Seat click on the right → highlights that seat on the left map and updates details.
- Division click → filters the seat list without destroying the current selected seat if it still belongs to that division.
- Search input → narrows available divisions and seats, while preserving the current selection if it still matches.
- If a selected seat falls out of the filtered set, the UI should either pin it at the top of Column 3 or clear selection explicitly. Do not leave the UI in an ambiguous state.

### Why This Landing Page Is Better
- Faster to operate than a pure map-detail split because users can browse by division without hunting on the map.
- Better performance because only one detailed seat pane exists and the map does not need to re-layout large detail content.
- Better discoverability because search, division grouping, and direct map click all point to the same seat-selection flow.

### Responsive / Mobile
On narrow screens (<768px), keep the summary strip at the top, place the map next, and collapse the three-column browser into progressive panels:

- Division list becomes a horizontal chip row or drawer.
- Seat list becomes a full-width searchable list under the division selector.
- Seat details remain below the list.
- Touch-tap on a constituency works identically to click.
- Maintain sync between map and selected seat exactly as on desktop.

---

## 5. Page 2 — Constituency Explorer (`/explorer`)

A searchable, sortable, filterable table of all 299 constituencies.

**Filters**:
- Division (dropdown)
- Alliance (multi-select chips)
- Winning party (multi-select)
- Turnout range (slider)

**Columns** (configurable — driven by a column-config array, not hardcoded):
- Constituency, District, Division
- Winner, Party, Alliance
- Winner Votes, Runner-up, Runner-up Votes
- Turnout%, Margin%, Vote Share%
- Cluster
- (toggleable: literacy, internet, urbanization)

**Clicking a row** navigates to the landing page with that seat pre-selected.

---

## 6. Page 3 — Analysis Overview (`/analysis/overview`)

High-level statistics. Entry point before the deeper analysis pages.

**Sections**:
1. **National Summary Cards**: Total seats, parties, avg turnout, avg margin, avg candidate count
2. **Seats by Party** — horizontal bar chart sorted by seats won
3. **Seats by Division** — grouped bar chart (division × alliance)
4. **Turnout Distribution** — histogram across all 299 seats
5. **Margin Distribution** — histogram (competitive vs. landslide)
6. **Competitiveness Map** — small choropleth colored by `competitiveness_index` (reuses map component)

---

## 7. Page 4 — Correlation Analysis (`/analysis/correlation`)

Shows Pearson and Spearman correlation matrices between all 19 socioeconomic + election features.

**Sections**:
1. **Toggle**: Pearson / Spearman (tab switchable, same component)
2. **Heatmap**: NxN color grid, color scale from −1 (red) → 0 (white) → +1 (blue). Cell hover shows exact value + variable names.
3. **Top Positive Correlations** — ranked list with bar indicators (e.g., `employment_rate_pct ↔ literacy_rate: 0.72`)
4. **Top Negative Correlations** — same, negative side
5. **Interpretation callout box**: plain-language summary of the 3 most notable correlations

**Component**: `<CorrelationHeatmap matrix cols />` — renders any NxN, not hardcoded to 19.

---

## 8. Page 5 — Regression: Turnout Model (`/analysis/regression`)

LinearRegression model predicting `turnout_pct` from socioeconomic features.

**Sections**:
1. **Model Card**: R² = 0.471, RMSE = 5.52 — with a plain-language interpretation ("explains ~47% of variance in voter turnout")
2. **Coefficient Chart**: horizontal bar chart sorted by |coefficient|, blue for positive, red for negative. Hover shows coefficient value.
3. **Formula display**: styled equation showing intercept + top coefficients
4. **Predicted vs. Actual scatter plot**: 299 points, x=actual turnout, y=predicted. Points colored by division. Hover shows constituency name.
5. **Feature contribution callout**: "Employment rate is the strongest positive predictor of turnout; internet penetration is the strongest negative predictor"

**Component**: `<CoefficientChart coefficients={Record<string,number>} />` — works for any regression output.

---

## 9. Page 6 — Classification: Party Prediction (`/analysis/classification`)

RandomForestClassifier predicting `winner_party`.

**Sections**:
1. **Model Card**: Accuracy 76.2%, F1 0.697, Precision 0.648, Recall 0.762
2. **Feature Importance Chart**: horizontal bar chart sorted by importance. All 15 features shown. Hover = value.
3. **Party Labels** — which parties the model was trained to distinguish (chips)
4. **Per-metric badges**: Accuracy, Weighted Precision, Weighted Recall, F1 — color-coded green/amber/red by threshold
5. **Top 3 predictors callout box**: plain text e.g. "Employment rate (9.9%), Dependency ratio (9.7%), and Candidate count (9.3%) were the most predictive features"
6. **Model parameters note**: 100 trees, max depth 5

**Component**: `<FeatureImportanceChart features={Record<string,number>} />` — parameterized.

---

## 10. Page 7 — Clustering (`/analysis/clusters`)

KMeans clustering of constituencies (k=2) by socioeconomic profile.

**Sections**:
1. **Cluster Cards** (side by side): for each cluster show name, count, and all `avg_*` metrics as labeled stats.
2. **Radar / Spider chart**: compare the two clusters across normalized dimensions (literacy, internet, urbanization, density, avg_margin)
3. **Cluster Map**: choropleth of Bangladesh colored by cluster assignment — reuses the same map component
4. **Cluster Profiles Table**: rows = clusters, cols = features, values highlighted relative to each other
5. **Interpretation callout**: "Cluster 1 (44 seats) represents highly urban, high-literacy constituencies — likely city/town seats. Cluster 0 (231 seats) represents rural Bangladesh."

---

## 11. Component Hierarchy

```
app/
  layout.tsx              ← nav bar + page shell
  page.tsx                ← Landing (split-panel map)
  explorer/page.tsx
  analysis/
    overview/page.tsx
    correlation/page.tsx
    regression/page.tsx
    classification/page.tsx
    clusters/page.tsx

components/
  map/
    BangladeshMap.tsx       ← main choropleth (Leaflet), props: data, colorKey, onSelect
    ConstituencyMiniMap.tsx ← single-seat zoomed view, props: feature
    MapLegend.tsx
  panels/
    SummaryStrip.tsx
    DivisionListPanel.tsx
    SeatListPanel.tsx
    SeatDetailPanel.tsx
  charts/
    CorrelationHeatmap.tsx  ← props: matrix: number[][], columns: string[]
    CoefficientChart.tsx    ← props: coefficients: Record<string,number>
    FeatureImportanceChart.tsx ← props: features: Record<string,number>
    ClusterRadarChart.tsx
    PartySeatBar.tsx
    TurnoutHistogram.tsx
    ScatterPlot.tsx
  ui/
    StatCard.tsx
    MetricBadge.tsx
    SocioBar.tsx            ← mini horizontal bar vs national avg
    PartyChip.tsx
    AllianceChip.tsx
    SearchInput.tsx

types/
  api.ts                   ← all TypeScript contracts

lib/
  data.ts                  ← typed fetch functions
  colors.ts                ← party/alliance color map (single source of truth)
  geo.ts                   ← GeoJSON helpers (name normalization, feature lookup)
```

---

## 12. Data Adapter Script

`data_science/scripts/build_frontend_data.py`

**Responsibilities**:
1. Read `analytics_base_csv/part-*.csv` → normalize constituency names (space→hyphen, spelling fixes) → write `constituencies.json`
2. Read `cluster_assignments_csv/part-*.csv` → merge cluster column into constituencies
3. Compute `summary.json` (party seats, division breakdown, national averages)
4. Convert `pearson_correlation.csv` + `spearman_correlation.csv` to matrix JSON → `correlation.json`
5. Copy + validate `classification_results.json` → `classification.json`
6. Copy + validate `regression_results.json` → `regression.json`
7. Copy + validate `cluster_profiles.json` → `clusters.json`

**Run command**: `python3 data_science/scripts/build_frontend_data.py`
**Output directory**: `frontend/public/data/`

**Name normalization** (GeoJSON `cst_n` → CSV `constituency`):
- `"Bagerhat-1"` → `"Bagerhat 1"` (hyphen → space)
- `"Barisal-1"` → `"Barishal 1"` (spelling)
- Any remaining unmatched names are logged as warnings

---

## 13. TypeScript Contracts (`frontend/types/api.ts`)

```typescript
// Per-constituency row — new DS fields added as optional
export interface ConstituencyRow {
  constituency: string
  district: string
  division: string
  alliance: string
  winner_candidate: string
  winner_party: string
  winner_votes: number
  runner_up_candidate: string
  runner_up_party: string
  runner_up_votes: number
  total_valid_votes: number
  candidate_count: number
  turnout_pct: number
  winning_margin_pct: number
  winner_vote_share_pct: number
  competitiveness_index: number
  cluster?: number
  // socioeconomic
  literacy_rate: number
  internet_pct: number
  urbanization_index: number
  employment_rate_pct: number
  neet_pct: number
  financial_account_pct: number
  pop_density: number
  dependency_ratio: number
  // any new DS field gets added here as optional: new_field?: number
}

export interface ElectionSummary {
  total_seats: number
  avg_turnout: number
  avg_margin: number
  seats_by_party: Record<string, number>
  seats_by_alliance: Record<string, number>
  seats_by_division: Record<string, Record<string, number>>  // division → party → seats
}

export interface CorrelationMatrix {
  columns: string[]
  pearson: number[][]
  spearman: number[][]
}

export interface ClassificationResult {
  model: string
  target: string
  party_labels: string[]
  metrics: Record<string, number>           // accuracy, f1, etc — any new metric just appears
  feature_importance: Record<string, number>
}

export interface RegressionResult {
  model: string
  target: string
  r2: number
  rmse: number
  intercept: number
  coefficients: Record<string, number>
  features: string[]
}

export interface ClusterProfile {
  cluster: number
  n: number
  [key: string]: number   // avg_literacy, avg_internet, etc — new fields automatic
}
```

---

## 14. Technology Decisions

| Need | Choice | Reason |
|---|---|---|
| Map rendering | **Leaflet** (react-leaflet) | GeoJSON is already on disk, no tile API key needed, supports MultiPolygon. Mapbox is the original plan but requires paid token for tiles. |
| Charts | **Recharts** | Already in plan, works well with React 19, composable |
| Styling | **TailwindCSS v4** | Already configured |
| Data fetching | Static JSON via `fetch('/data/*.json')` | Spark runs offline; static files are fast and zero-infra |
| State management | React `useState` / `useContext` | No Redux needed for this scale |
| Routing | Next.js App Router | Already set up |

---

## 15. Build Sequence

| Step | What | Output |
|---|---|---|
| 1 | Write `build_frontend_data.py` | Populates `public/data/*.json` |
| 2 | Define `types/api.ts` | TypeScript contracts |
| 3 | Write `lib/data.ts` + `lib/colors.ts` + `lib/geo.ts` | Data + utility layer |
| 4 | Build `BangladeshMap` component | Map renders with party colors |
| 5 | Build `SummaryStrip` + division/seat browser panels | Landing page control layer |
| 6 | Wire landing page (`/`) | Summary strip + synced map/browser working |
| 7 | Build Explorer page | Table with filters |
| 8 | Build Analysis pages (one per model) | All 5 analysis pages |
| 9 | Nav bar + routing | Full site navigation |
| 10 | Polish: mobile layout, loading states, empty states | Production-ready |

---

## 16. Flexibility Rules (for future DS changes)

| DS Change | Only touch |
|---|---|
| Rename a column | 1 mapping in `build_frontend_data.py` |
| Add new feature column | 1 line in adapter + optional field in `ConstituencyRow` |
| Add new ML model | New section in adapter + new type interface + new analysis page |
| Change number of clusters | Nothing — `ClusterProfile[]` is already an array |
| New correlation method | Add key to adapter + extend `CorrelationMatrix` |
| Replace RandomForest with XGBoost | Change model name string + rebuild JSON — same page renders |
| Completely new analysis | New JSON file + new type + new `/analysis/x` page |
