"""
HREP pipeline, step 1: daily county-mean TEMPO NO2 on Google Earth Engine.

For every day, all TEMPO L3 V04 hourly scans are quality-filtered, averaged per
2.2-km pixel, and then averaged over each county (area-weighted). The result is
exported to Google Drive as one CSV per month.

Usage (from the E:\\HREP folder):
    python pipeline/gee_export_county_no2.py --project YOUR_GEE_PROJECT --start 2023-08 --end 2026-09

Then download the CSVs from the Drive folder below and run build_hrep_data.py.
"""
import argparse
from datetime import date

import ee

# ---- Settings (document any change in the README / methods) -----------------
COLLECTION = "NASA/TEMPO/NO2_L3_V4"   # TEMPO gridded NO2 L3, version 04
COUNTIES = "TIGER/2018/Counties"       # Census county boundaries (GEOID = 5-digit FIPS)
EXCLUDE_STATEFP = ["02", "15", "60", "66", "69", "72", "78"]  # AK, HI, territories: outside TEMPO's CONUS view
MAX_CLOUD = 0.2      # effective cloud fraction; keep pixels with eff_cloud_fraction <= this
MAX_SZA = 70         # solar zenith angle (deg); drops low-sun early-morning / late-evening scans
SCALE = 2226         # metres, native TEMPO L3 pixel size
DAY_OFFSET_H = 6     # a "day" runs 06:00 UTC to 06:00 UTC next day, so every daylight scan
                     # over CONUS falls on its local calendar date (Eastern to Pacific)
DRIVE_FOLDER = "HREP_TEMPO_county"
# ------------------------------------------------------------------------------


def qa_mask(img):
    good = (
        img.select("main_data_quality_flag").eq(0)
        .And(img.select("eff_cloud_fraction").lte(MAX_CLOUD))
        .And(img.select("solar_zenith_angle").lte(MAX_SZA))
    )
    return img.select("vertical_column_troposphere").updateMask(good)


def daily_county(day, counties):
    """County means for one day. `day` is an ee.Date at 00:00 UTC."""
    day = ee.Date(day)
    start = day.advance(DAY_OFFSET_H, "hour")
    scans = ee.ImageCollection(COLLECTION).filterDate(start, start.advance(1, "day")).map(qa_mask)

    empty = ee.Image.constant(0).updateMask(0).rename("vertical_column_troposphere").toFloat()
    daily = ee.Image(ee.Algorithms.If(scans.size().gt(0), scans.mean(), empty)).rename("no2")
    # 'all' marks every pixel, so all_count = county size in pixels (for a coverage check later)
    img = daily.addBands(ee.Image.constant(1).rename("all"))

    reducer = ee.Reducer.mean().combine(ee.Reducer.count(), sharedInputs=True)
    stats = img.reduceRegions(
        collection=counties, reducer=reducer, scale=SCALE, crs="EPSG:4326", tileScale=4
    )
    date_str = day.format("YYYY-MM-dd")
    return stats.map(
        lambda f: ee.Feature(
            None,
            {
                "GEOID": f.get("GEOID"),
                "date": date_str,
                "no2_mean": f.get("no2_mean"),
                "no2_count": f.get("no2_count"),
                "all_count": f.get("all_count"),
            },
        )
    )


def month_starts(first, last):
    y, m = map(int, first.split("-"))
    y1, m1 = map(int, last.split("-"))
    while (y, m) <= (y1, m1):
        yield date(y, m, 1)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def export_month(m0, counties):
    m1 = date(m0.year + (m0.month == 12), m0.month % 12 + 1, 1)
    n_days = (m1 - m0).days
    first = ee.Date(m0.isoformat())
    days = ee.List.sequence(0, n_days - 1).map(lambda i: first.advance(i, "day"))
    fc = ee.FeatureCollection(days.map(lambda d: daily_county(d, counties))).flatten()

    name = f"hrep_no2_{m0:%Y_%m}"
    task = ee.batch.Export.table.toDrive(
        collection=fc,
        description=name,
        folder=DRIVE_FOLDER,
        fileNamePrefix=name,
        fileFormat="CSV",
        selectors=["GEOID", "date", "no2_mean", "no2_count", "all_count"],
    )
    task.start()
    print(f"Started export {name}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--project", required=True, help="Google Cloud project registered for Earth Engine")
    p.add_argument("--start", required=True, help="first month, YYYY-MM (TEMPO data begin 2023-08)")
    p.add_argument("--end", required=True, help="last month, YYYY-MM")
    a = p.parse_args()

    ee.Initialize(project=a.project)
    counties = (
        ee.FeatureCollection(COUNTIES)
        .filter(ee.Filter.inList("STATEFP", EXCLUDE_STATEFP).Not())
        .select(["GEOID"])
    )
    for m0 in month_starts(a.start, a.end):
        export_month(m0, counties)
    print(f"\nTrack progress at https://code.earthengine.google.com/tasks")
    print(f"Files will appear in Google Drive folder '{DRIVE_FOLDER}'.")


if __name__ == "__main__":
    main()
