"""
enrich_bescom_bwssb.py — Geo-based BESCOM & BWSSB assignment for all BBMP wards.

Current assignments in wards.json were made by name similarity which can be
inaccurate across zone boundaries. This script:
  1. Geocodes each ward centroid via Nominatim (OpenStreetMap, free, 1 req/sec)
  2. Geocodes each BESCOM om_unit and BWSSB service_station
  3. For each ward, assigns the nearest BESCOM unit and BWSSB station
  4. Updates wards.json with correct contact details

All geocodes are cached in data/geo_cache.json so the script can be
interrupted and restarted without re-fetching.

Run from the GovWatch root directory:
    python scripts/enrich_bescom_bwssb.py

Expected runtime: ~25-35 minutes (rate-limited to 1 request/sec).
Progress is printed live. Output: updated data/officials/wards.json
"""

import json
import math
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Tuple

ROOT = Path(__file__).parent.parent
WARDS_PATH   = ROOT / "data/officials/wards.json"
BESCOM_PATH  = ROOT / "data/officials/bescom_units.json"
BWSSB_PATH   = ROOT / "data/officials/bwssb_stations.json"
CACHE_PATH   = ROOT / "data/geo_cache.json"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT    = "GovWatch-Bangalore/1.0 (civic dashboard; contact: admin@govwatch.in)"
RATE_LIMIT    = 1.1   # seconds between requests

_last_request = 0.0


def geocode(place: str) -> Optional[Tuple[float, float]]:
    """Return (lat, lon) for a place string, or None on failure."""
    global _last_request
    cache = load_cache()
    key = place.strip().lower()
    if key in cache:
        entry = cache[key]
        if entry is None:
            return None
        return entry["lat"], entry["lon"]

    elapsed = time.time() - _last_request
    if elapsed < RATE_LIMIT:
        time.sleep(RATE_LIMIT - elapsed)

    params = urllib.parse.urlencode({
        "q": place,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
    })
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        _last_request = time.time()
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read())
        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            cache[key] = {"lat": lat, "lon": lon}
            save_cache(cache)
            return lat, lon
        else:
            cache[key] = None
            save_cache(cache)
            return None
    except Exception as e:
        print(f"  [geocode error] {place!r}: {e}")
        return None


def haversine(lat1, lon1, lat2, lon2) -> float:
    """Great-circle distance in km."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def load_cache() -> dict:
    if CACHE_PATH.exists():
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def load_json(path) -> list | dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def geocode_all(items, label: str) -> dict:
    """Geocode a list of place names, return {name: (lat, lon)} for successes."""
    coords = {}
    total = len(items)
    for i, name in enumerate(items, 1):
        query = f"{name}, Bangalore, Karnataka"
        result = geocode(query)
        status = f"({result[0]:.4f}, {result[1]:.4f})" if result else "NOT FOUND"
        print(f"  [{i}/{total}] {label} {name!r}: {status}")
        if result:
            coords[name] = result
    return coords


def nearest(ward_lat, ward_lon, coord_map: dict) -> Optional[str]:
    """Return the name of the nearest place to (ward_lat, ward_lon)."""
    best_name = None
    best_dist = float("inf")
    for name, (lat, lon) in coord_map.items():
        d = haversine(ward_lat, ward_lon, lat, lon)
        if d < best_dist:
            best_dist = d
            best_name = name
    return best_name


def main():
    wards   = load_json(WARDS_PATH)
    bescom  = load_json(BESCOM_PATH)
    bwssb   = load_json(BWSSB_PATH)

    # ── Step 1: Geocode ward centroids ────────────────────────────────
    print("=" * 60)
    print("Step 1: Geocoding ward centroids")
    print("=" * 60)
    ward_names = [w["ward_name"] for w in wards]
    ward_coords = geocode_all(ward_names, "Ward")
    print(f"\nGeocoded {len(ward_coords)} / {len(ward_names)} wards\n")

    # ── Step 2: Geocode BESCOM om_units ───────────────────────────────
    print("=" * 60)
    print("Step 2: Geocoding BESCOM units")
    print("=" * 60)
    bescom_names = list({b["om_unit"] for b in bescom})
    bescom_coords = geocode_all(bescom_names, "BESCOM")
    print(f"\nGeocoded {len(bescom_coords)} / {len(bescom_names)} BESCOM units\n")

    # ── Step 3: Geocode BWSSB service stations ────────────────────────
    print("=" * 60)
    print("Step 3: Geocoding BWSSB stations")
    print("=" * 60)
    bwssb_names = list({b["service_station"] for b in bwssb})
    bwssb_coords = geocode_all(bwssb_names, "BWSSB")
    print(f"\nGeocoded {len(bwssb_coords)} / {len(bwssb_names)} BWSSB stations\n")

    # ── Step 4: Build lookup tables ───────────────────────────────────
    bescom_by_unit = {b["om_unit"]: b for b in bescom}
    bwssb_by_station = {b["service_station"]: b for b in bwssb}

    # ── Step 5: Assign nearest BESCOM and BWSSB per ward ──────────────
    print("=" * 60)
    print("Step 4: Assigning BESCOM and BWSSB to each ward")
    print("=" * 60)

    changed_bescom = 0
    changed_bwssb  = 0
    skipped_no_coord = 0

    for ward in wards:
        wname = ward["ward_name"]
        if wname not in ward_coords:
            skipped_no_coord += 1
            continue

        w_lat, w_lon = ward_coords[wname]

        # ── BESCOM ───────────────────────────────────────────────────
        if bescom_coords:
            best_unit = nearest(w_lat, w_lon, bescom_coords)
            if best_unit and best_unit != ward.get("bescom_unit"):
                old = ward.get("bescom_unit", "")
                unit_data = bescom_by_unit.get(best_unit, {})
                ward["bescom_unit"]        = best_unit
                ward["bescom_subdivision"] = unit_data.get("subdivision", "")
                ward["bescom_aee"]         = unit_data.get("aee", "")
                ward["bescom_ae_je"]       = unit_data.get("ae_je", "")
                changed_bescom += 1
                print(f"  BESCOM {wname}: {old!r} → {best_unit!r}")

        # ── BWSSB ────────────────────────────────────────────────────
        if bwssb_coords:
            best_station = nearest(w_lat, w_lon, bwssb_coords)
            if best_station and best_station != ward.get("bwssb_station"):
                old = ward.get("bwssb_station", "")
                st_data = bwssb_by_station.get(best_station, {})
                ward["bwssb_station"]    = best_station
                ward["bwssb_ae"]         = st_data.get("ae_name", "")
                ward["bwssb_ae_mobile"]  = st_data.get("station_mobile", "")
                ward["bwssb_aee"]        = st_data.get("aee_name", "")
                ward["bwssb_aee_mobile"] = st_data.get("aee_mobile", "")
                changed_bwssb += 1
                print(f"  BWSSB  {wname}: {old!r} → {best_station!r}")

    # ── Step 6: Save ──────────────────────────────────────────────────
    save_json(WARDS_PATH, wards)
    print()
    print("=" * 60)
    print("Done.")
    print(f"  BESCOM assignments changed : {changed_bescom}")
    print(f"  BWSSB  assignments changed : {changed_bwssb}")
    print(f"  Wards skipped (no geocode) : {skipped_no_coord}")
    print(f"  Updated wards.json saved   : {WARDS_PATH}")
    print()
    print("Commit and push:")
    print("  git add data/officials/wards.json data/geo_cache.json")
    print("  git commit -m 'Enrich BESCOM/BWSSB assignments via geo-proximity'")
    print("  git push")


if __name__ == "__main__":
    main()
