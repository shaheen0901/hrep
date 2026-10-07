"""
HREP pipeline, step 2: turn the Earth Engine exports into the files the web tool reads.

Usage (from the E:\\HREP folder):
    python pipeline/build_hrep_data.py --input "C:\\path\\to\\HREP_TEMPO_county"

Reads every hrep_no2_YYYY_MM.csv in --input and rewrites, in public/data/:
    no2/no2_<ST>.csv     fips,date,no2,n_obs          (daily, one file per state)
    monthly_means.csv    fips,month,no2,n_days        (colors the map)
    manifest.json        dates, units, states, last update
"""
import argparse
import json
import shutil
from datetime import date
from pathlib import Path

import pandas as pd

MIN_COVERAGE = 0.25  # keep a county-day only if >= 25% of its pixels had a valid retrieval
SCALE = 1e15         # store values in 10^15 molecules/cm^2

STATE_ABBR = {
    "01": "AL", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC",
    "12": "FL", "13": "GA", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
    "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO",
    "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC",
    "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY",
}

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--input", required=True, help="folder with the hrep_no2_YYYY_MM.csv files from Google Drive")
    a = p.parse_args()

    files = sorted(Path(a.input).glob("hrep_no2_*.csv"))
    if not files:
        raise SystemExit(f"No hrep_no2_*.csv files found in {a.input}")
    print(f"Reading {len(files)} monthly files")
    df = pd.concat((pd.read_csv(f, dtype={"GEOID": str}) for f in files), ignore_index=True)
    n_raw = len(df)

    df["fips"] = df["GEOID"].str.zfill(5)
    df = df[df["fips"].str[:2].isin(STATE_ABBR)]
    df = df.dropna(subset=["no2_mean", "no2_count", "all_count"])
    df = df[(df["all_count"] > 0) & ((df["no2_count"] / df["all_count"]) >= MIN_COVERAGE)]
    df = df.drop_duplicates(["fips", "date"], keep="last").sort_values(["fips", "date"])

    df["no2"] = (df["no2_mean"] / SCALE).round(3)
    df["n_obs"] = df["no2_count"].astype(int)
    df["state"] = df["fips"].str[:2].map(STATE_ABBR)
    print(f"Kept {len(df):,} of {n_raw:,} county-days after the coverage check")

    # Daily files, one per state (old files removed first, e.g. the synthetic test data).
    no2_dir = OUT / "no2"
    shutil.rmtree(no2_dir, ignore_errors=True)
    no2_dir.mkdir(parents=True)
    for st, g in df.groupby("state"):
        g[["fips", "date", "no2", "n_obs"]].to_csv(no2_dir / f"no2_{st}.csv", index=False)

    # Monthly means for the map.
    df["month"] = df["date"].str[:7]
    monthly = (
        df.groupby(["fips", "month"])["no2"].agg(no2="mean", n_days="count").reset_index()
    )
    monthly["no2"] = monthly["no2"].round(3)
    monthly.to_csv(OUT / "monthly_means.csv", index=False)

    manifest = {
        "title": "HREP county NO2",
        "variable": "Tropospheric NO2 vertical column, daily county mean (TEMPO L3 V04)",
        "units": "10^15 molecules/cm^2",
        "units_short": "10¹⁵ molec/cm²",
        "start_date": df["date"].min(),
        "end_date": df["date"].max(),
        "last_updated": date.today().isoformat(),
        "states": sorted(df["state"].unique().tolist()),
        "synthetic": False,
        "source": "NASA TEMPO NO2 L3 V04 (doi:10.5067/IS-40e/TEMPO/NO2_L3.004), processed on Google Earth Engine",
        "processing": {
            "quality_flag": "main_data_quality_flag == 0",
            "max_eff_cloud_fraction": 0.2,
            "max_solar_zenith_angle": 70,
            "day_definition": "06:00 UTC to 06:00 UTC next day",
            "min_county_coverage": MIN_COVERAGE,
        },
        "files": {"monthly": "monthly_means.csv", "daily": "no2/no2_<STATE>.csv"},
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {df['state'].nunique()} state files, {len(monthly):,} monthly rows")
    print(f"Data cover {manifest['start_date']} to {manifest['end_date']}")


if __name__ == "__main__":
    main()
