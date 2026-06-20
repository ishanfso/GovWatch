"""
enrich_bescom_bwssb.py — Geo-based assignment for BESCOM, BWSSB, and Traffic PS.

Current assignments in wards.json were made by name similarity which can be
inaccurate across zone boundaries. This script:
  1. Geocodes each ward centroid via Nominatim (OpenStreetMap, free, 1 req/sec)
  2. Geocodes each BESCOM om_unit, BWSSB service_station, and Traffic PS name
  3. For each ward, assigns the nearest unit/station/PS by Haversine distance
  4. Updates wards.json with correct contact details

All geocodes are cached in data/geo_cache.json so the script can be
interrupted and restarted without re-fetching.

Run from the GovWatch root directory:
    python scripts/enrich_bescom_bwssb.py

Expected runtime: ~30-40 minutes (rate-limited to 1 req/sec per Nominatim policy).
Progress is printed live. Output: updated data/officials/wards.json
"""

import json
import math
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Tuple

ROOT         = Path(__file__).parent.parent
WARDS_PATH   = ROOT / "data/officials/wards.json"
BESCOM_PATH  = ROOT / "data/officials/bescom_units.json"
BWSSB_PATH   = ROOT / "data/officials/bwssb_stations.json"
TRAFFIC_PATH = ROOT / "data/officials/traffic_rti.json"
CACHE_PATH   = ROOT / "data/geo_cache.json"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT    = "GovWatch-Bangalore/1.0 (civic dashboard; contact: admin@govwatch.in)"
RATE_LIMIT    = 1.1   # seconds between requests (Nominatim policy: max 1/sec)

_last_request = 0.0


def geocode(place: str) -> Optional[Tuple[float, float]]:
    """Return (lat, lon) for a place string, or None on failure. Caches results."""
    global _last_request
    cache = load_cache()
    key = place.strip().lower()
    if key in cache:
        entry = cache[key]
        if entry is None or (isinstance(entry, dict) and entry.get("skip")):
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
    url = "{0}?{1}".format(NOMINATIM_URL, params)
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
        print("  [geocode error] {0!r}: {1}".format(place, e))
        return None


def haversine(lat1, lon1, lat2, lon2):
    """Great-circle distance in km."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def load_cache():
    if CACHE_PATH.exists():
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def geocode_all(items, label):
    """Geocode a list of place names, return {name: (lat, lon)} for hits."""
    coords = {}
    total = len(items)
    for i, name in enumerate(items, 1):
        query = "{0}, Bangalore, Karnataka".format(name)
        result = geocode(query)
        if result:
            status = "({0:.4f}, {1:.4f})".format(result[0], result[1])
            coords[name] = result
        else:
            status = "NOT FOUND"
        print("  [{0}/{1}] {2} {3!r}: {4}".format(i, total, label, name, status))
    return coords


def nearest(ward_lat, ward_lon, coord_map):
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
    traffic = load_json(TRAFFIC_PATH)

    # ── Step 1: Geocode ward centroids ────────────────────────────────
    print("=" * 60)
    print("Step 1: Geocoding ward centroids ({0} wards)".format(len(wards)))
    print("=" * 60)
    ward_names = [w["ward_name"] for w in wards]
    ward_coords = geocode_all(ward_names, "Ward")
    print("\nGeocoded {0} / {1} wards\n".format(len(ward_coords), len(ward_names)))

    # ── Step 2: Geocode BESCOM om_units ───────────────────────────────
    print("=" * 60)
    bescom_names = list(set(b["om_unit"] for b in bescom))
    print("Step 2: Geocoding BESCOM units ({0} unique)".format(len(bescom_names)))
    print("=" * 60)
    bescom_coords = geocode_all(bescom_names, "BESCOM")
    print("\nGeocoded {0} / {1} BESCOM units\n".format(len(bescom_coords), len(bescom_names)))

    # ── Step 3: Geocode BWSSB service stations ────────────────────────
    print("=" * 60)
    bwssb_names = list(set(b["service_station"] for b in bwssb))
    print("Step 3: Geocoding BWSSB stations ({0} unique)".format(len(bwssb_names)))
    print("=" * 60)
    bwssb_coords = geocode_all(bwssb_names, "BWSSB")
    print("\nGeocoded {0} / {1} BWSSB stations\n".format(len(bwssb_coords), len(bwssb_names)))

    # ── Step 4: Geocode Traffic Police Stations ───────────────────────
    print("=" * 60)
    traffic_names = list(set(t["ps"] for t in traffic if t.get("ps")))
    print("Step 4: Geocoding Traffic PS ({0} unique)".format(len(traffic_names)))
    print("=" * 60)
    traffic_coords = geocode_all(traffic_names, "Traffic PS")
    print("\nGeocoded {0} / {1} Traffic PS\n".format(len(traffic_coords), len(traffic_names)))

    # ── Build lookup tables ───────────────────────────────────────────
    bescom_by_unit    = {b["om_unit"]: b for b in bescom}
    bwssb_by_station  = {b["service_station"]: b for b in bwssb}
    traffic_by_ps     = {t["ps"]: t for t in traffic if t.get("ps")}

    # ── Step 5: Assign nearest unit per ward ──────────────────────────
    print("=" * 60)
    print("Step 5: Assigning BESCOM, BWSSB, Traffic PS to each ward")
    print("=" * 60)

    changed_bescom  = 0
    changed_bwssb   = 0
    changed_traffic = 0
    skipped         = 0

    for ward in wards:
        wname = ward["ward_name"]
        if wname not in ward_coords:
            skipped += 1
            continue

        w_lat, w_lon = ward_coords[wname]

        # ── BESCOM ───────────────────────────────────────────────────
        if bescom_coords:
            best = nearest(w_lat, w_lon, bescom_coords)
            if best and best != ward.get("bescom_unit"):
                old = ward.get("bescom_unit", "")
                d = bescom_by_unit.get(best, {})
                ward["bescom_unit"]        = best
                ward["bescom_subdivision"] = d.get("subdivision", "")
                ward["bescom_aee"]         = d.get("aee", "")
                ward["bescom_ae_je"]       = d.get("ae_je", "")
                changed_bescom += 1
                print("  BESCOM  {0}: {1!r} -> {2!r}".format(wname, old, best))

        # ── BWSSB ────────────────────────────────────────────────────
        if bwssb_coords:
            best = nearest(w_lat, w_lon, bwssb_coords)
            if best and best != ward.get("bwssb_station"):
                old = ward.get("bwssb_station", "")
                d = bwssb_by_station.get(best, {})
                ward["bwssb_station"]    = best
                ward["bwssb_ae"]         = d.get("ae_name", "")
                ward["bwssb_ae_mobile"]  = d.get("station_mobile", "")
                ward["bwssb_aee"]        = d.get("aee_name", "")
                ward["bwssb_aee_mobile"] = d.get("aee_mobile", "")
                changed_bwssb += 1
                print("  BWSSB   {0}: {1!r} -> {2!r}".format(wname, old, best))

        # ── Traffic PS ───────────────────────────────────────────────
        if traffic_coords:
            best = nearest(w_lat, w_lon, traffic_coords)
            if best and best != ward.get("traffic_ps"):
                old = ward.get("traffic_ps", "")
                d = traffic_by_ps.get(best, {})
                ward["traffic_ps"]         = best
                ward["traffic_pio"]        = d.get("pio", "")
                ward["traffic_pio_contact"]= d.get("pio_contact", "")
                changed_traffic += 1
                print("  Traffic {0}: {1!r} -> {2!r}".format(wname, old, best))

    # ── Step 6: Save ──────────────────────────────────────────────────
    save_json(WARDS_PATH, wards)
    print()
    print("=" * 60)
    print("Done.")
    print("  BESCOM  assignments changed : {0}".format(changed_bescom))
    print("  BWSSB   assignments changed : {0}".format(changed_bwssb))
    print("  Traffic assignments changed : {0}".format(changed_traffic))
    print("  Wards skipped (no geocode)  : {0}".format(skipped))
    print("  Updated wards.json saved    : {0}".format(WARDS_PATH))
    print()
    print("Next: commit and push")
    print("  git add data/officials/wards.json data/geo_cache.json")
    print("  git commit -m 'Geo-based BESCOM/BWSSB/Traffic assignments for all wards'")
    print("  git push")


if __name__ == "__main__":
    main()
