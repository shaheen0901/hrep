# HREP: Health-Ready Exposure Platform

A web tool to map, compare and download daily county-level NO₂ (tropospheric column) derived from NASA TEMPO Level 3 data. Developed by the GeoSENSE Lab, LSU Health Sciences Center New Orleans.

Live site: https://shaheen0901.github.io/hrep/

## Run locally

```
npm install
npm run dev
```

Then open http://localhost:5173/

## Data files

All data lives in `public/data/` and is read by the browser as static files.

| File | Columns / content | Used for |
|---|---|---|
| `manifest.json` | dates covered, units, list of states, last update | header, date limits |
| `monthly_means.csv` | `fips,month,no2,n_days` | coloring the national map |
| `no2/no2_<ST>.csv` | `fips,date,no2,n_obs` (one file per state) | time series, statistics, downloads |
| `counties-10m.json` | county boundaries (TopoJSON, from us-atlas) | map shapes |

- `fips` is the 5-digit county FIPS code as text (keep leading zeros).
- `no2` is the daily county mean tropospheric NO₂ column in 10¹⁵ molecules/cm².
- Days without a valid retrieval are simply left out of the state files.
- Set `"synthetic": false` in `manifest.json` once real data is in place (this removes the test-data banner).

### Real data from NASA TEMPO (Google Earth Engine)

1. `python pipeline/gee_export_county_no2.py --project YOUR_GEE_PROJECT --start 2023-08 --end 2026-09`
   starts one Earth Engine export per month (daily county means of QA-filtered TEMPO NO2 L3 V04).
2. Download the finished CSVs from the Google Drive folder `HREP_TEMPO_county`.
3. `python pipeline/build_hrep_data.py --input "path/to/HREP_TEMPO_county"` rewrites `public/data/`.

Processing: pixels with `main_data_quality_flag == 0`, effective cloud fraction <= 0.2 and solar zenith
angle <= 70 deg are averaged per pixel over each day (06 UTC to 06 UTC), then averaged over each county.
County-days with valid data over less than 25% of the county are dropped. Settings are at the top of each script.

### Test data

`node pipeline/make_synthetic_data.mjs` creates synthetic files in the correct format for 2025 (CONUS + DC). Replace them with the output of the TEMPO processing pipeline.

## Monthly update

1. Run the processing pipeline so it rewrites the files above in `public/data/`.
2. Update `end_date` and `last_updated` in `manifest.json`.
3. Commit and push to `main`. GitHub Actions builds and publishes the site automatically.

## Project layout

```
src/components/   CountyMap, TimeSeriesChart, SelectedTable, DateRange, DownloadPanel
src/utils/        data loading, colors, CSV download, state FIPS table
pipeline/         data-processing scripts
public/data/      data served to the browser
```
