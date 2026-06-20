"""
GovWatch — Location Enrichment Script
Extracts specific Bangalore locality from tweet text using Claude Haiku,
geocodes it to lat/lon via Nominatim (free OSM API), then fuzzy-matches
to the correct BBMP ward. Stores area, lat, lon, ward_name, ward_no on
each issue so the dashboard can show the right officials.

This is a post-processing step — run it after filter_issues.py:
  python enrich_locations.py              # fix all issues with area="Bangalore"
  python enrich_locations.py --days 15   # only issues from last 15 days
  python enrich_locations.py --all       # re-process every issue

Skips issues that already have ward_name set (use --all to override).

Requirements:
  pip install anthropic requests
  config.py must contain ANTHROPIC_API_KEY
"""

import json
import os
import sys
import time
import argparse
import re
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

try:
    sys.path.insert(0, os.path.dirname(__file__))
    import config
    ANTHROPIC_API_KEY = getattr(config, "ANTHROPIC_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY", "")
except ImportError:
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

if not ANTHROPIC_API_KEY:
    print("ERROR: ANTHROPIC_API_KEY not found. Set it in scripts/config.py or as env var.")
    sys.exit(1)

BASE = os.path.dirname(__file__)
ISSUES_FILE        = os.path.join(BASE, "../data/issues.json")
WARDS_FILE         = os.path.join(BASE, "../data/officials/wards.json")
AREA_LOOKUP_FILE   = os.path.join(BASE, "../data/officials/area_ward_lookup.json")
GEO_CACHE_FILE     = os.path.join(BASE, "../data/geo_cache.json")

NOMINATIM_BASE    = "https://nominatim.openstreetmap.org"
NOMINATIM_HEADERS = {
    "User-Agent": "GovWatch/1.0 civic-intelligence ishansharma@meesho.com"
}
NOMINATIM_DELAY = 1.1  # seconds — Nominatim ToS requires max 1 req/sec

# Common Bangalore area aliases not in wards.json (maps to canonical name for geocoding)
AREA_ALIASES = {
    "orr": "Outer Ring Road", "itpl": "Whitefield", "manyata": "Hebbal",
    "kr puram": "KR Puram", "kr pura": "KR Puram", "malleswaram": "Malleshwaram",
    "malleshwaram": "Malleshwaram", "chikkalsandra": "Basavanagudi",
    "nagarbhavi": "Rajajinagar", "banaswadi": "Kalyan Nagar",
    "rr nagar": "Rajajinagar", "mysore road": "Vijayanagar",
    "old airport road": "Indiranagar", "airport road": "Indiranagar",
    "cunningham road": "MG Road", "residency road": "MG Road",
    "hsr": "HSR Layout", "btm": "BTM Layout", "jp nagar": "JP Nagar",
    "jpnagar": "JP Nagar", "rt nagar": "RT Nagar", "hbr layout": "Kalyan Nagar",
    "ulsoor": "Indiranagar", "ejipura": "Koramangala",
    "haralur": "Bellandur", "sarjapur road": "Bellandur",
    "bommasandra": "Electronic City", "attibele": "Electronic City",
}


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def trigram_sim(a, b):
    """Jaccard similarity on character trigrams."""
    def tg(s):
        s = s.lower()
        return {s[i:i+3] for i in range(len(s) - 2)} if len(s) >= 3 else {s}
    ta, tb = tg(a), tg(b)
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0


def match_ward(candidates, wards, area_lookup):
    """Match a list of candidate location strings to a ward object."""
    # Pass 1 — exact / substring match in the 28-area lookup table
    for candidate in candidates:
        lc = candidate.lower().strip()
        # Check aliases first
        lc = AREA_ALIASES.get(lc, candidate).lower()
        for key, info in area_lookup.items():
            kl = key.lower()
            wn = info["ward_name"].lower()
            if lc == kl or lc in kl or kl in lc:
                for w in wards:
                    if w["ward_name"].lower() == wn:
                        return w

    # Pass 2 — trigram similarity against all 369 ward names
    best, best_score = None, 0.35
    for candidate in candidates:
        lc = candidate.lower().strip()
        lc = AREA_ALIASES.get(lc, candidate).lower()
        for w in wards:
            score = trigram_sim(lc, w["ward_name"].lower())
            if score > best_score:
                best_score = score
                best = w
    return best


def geocode_area(area, cache):
    """Geocode area → {lat, lon, candidates}. Caches results to avoid repeat calls."""
    key = area.lower().strip()
    if key in cache:
        return cache[key]

    time.sleep(NOMINATIM_DELAY)
    try:
        resp = requests.get(
            f"{NOMINATIM_BASE}/search",
            params={"q": f"{area}, Bangalore, India", "format": "json", "limit": 1, "addressdetails": 1},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        data = resp.json()
        if not data:
            cache[key] = None
            return None

        lat, lon = float(data[0]["lat"]), float(data[0]["lon"])

        # Reverse geocode to get finer-grained neighbourhood/suburb labels
        time.sleep(NOMINATIM_DELAY)
        rev = requests.get(
            f"{NOMINATIM_BASE}/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "addressdetails": 1},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        addr = rev.json().get("address", {})

        candidates = [c for c in [
            area,
            addr.get("neighbourhood"),
            addr.get("suburb"),
            addr.get("quarter"),
            addr.get("residential"),
            addr.get("village"),
            addr.get("city_district"),
        ] if c]

        entry = {"lat": lat, "lon": lon, "candidates": candidates}
        cache[key] = entry
        return entry

    except Exception as e:
        print(f"    Geocode error for '{area}': {e}")
        cache[key] = None
        return None


def extract_area_llm(text, client):
    """Use Claude Haiku to extract the specific Bangalore locality from a tweet."""
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=30,
            messages=[{
                "role": "user",
                "content": (
                    "Extract the specific Bangalore area, locality, or neighbourhood mentioned in this tweet.\n"
                    "Return ONLY the locality name (e.g. 'Koramangala', 'HSR Layout', 'Whitefield', 'Malleshwaram').\n"
                    "If multiple locations, return the most specific one.\n"
                    "If no specific Bangalore location is mentioned, return exactly: Bangalore\n"
                    "Do not include 'Bangalore' or 'Bengaluru' as a suffix.\n\n"
                    f"Tweet: {text}\n\nLocation:"
                ),
            }],
        )
        extracted = resp.content[0].text.strip().strip('"').strip("'")
        # Strip trailing city names
        extracted = re.sub(r"\s*[,\s]*(Bangalore|Bengaluru)\s*$", "", extracted, flags=re.IGNORECASE).strip()
        return extracted if extracted else "Bangalore"
    except Exception as e:
        print(f"    LLM error: {e}")
        return "Bangalore"


def main():
    parser = argparse.ArgumentParser(description="Enrich issues.json with ward/location data")
    parser.add_argument("--days", type=int, default=0,
                        help="Only process issues from last N days (default: all)")
    parser.add_argument("--all", action="store_true",
                        help="Re-process all issues, even those with ward_name already set")
    args = parser.parse_args()

    issues = load_json(ISSUES_FILE)
    wards = load_json(WARDS_FILE)
    area_lookup = load_json(AREA_LOOKUP_FILE)
    geo_cache = load_json(GEO_CACHE_FILE) if os.path.exists(GEO_CACHE_FILE) else {}
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    cutoff = None
    if args.days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)

    to_process = []
    for idx, issue in enumerate(issues):
        # Date filter
        if cutoff:
            try:
                d = datetime.fromisoformat(issue["date"].replace("Z", "+00:00"))
                if d < cutoff:
                    continue
            except Exception:
                pass

        # Skip already-enriched unless --all
        if not args.all and issue.get("ward_name"):
            continue

        # Only process generic "Bangalore" area unless --all
        if not args.all and issue.get("area", "Bangalore") != "Bangalore":
            continue

        to_process.append((idx, issue))

    print(f"Issues to enrich: {len(to_process)} of {len(issues)}")
    if len(to_process) == 0:
        print("Nothing to do. Use --all to re-process issues that already have ward data.")
        return

    updated = 0
    skipped = 0

    for i, (idx, issue) in enumerate(to_process):
        print(f"[{i+1}/{len(to_process)}] id={str(issue['id'])[:18]} area={issue.get('area','?')}")

        # Step 1: LLM area extraction
        extracted = extract_area_llm(issue["text"], client)
        print(f"  → LLM: '{extracted}'")

        if extracted.lower() in ("bangalore", "bengaluru", ""):
            # No specific location found — leave area as-is, clear ward fields
            issues[idx].setdefault("ward_name", "")
            issues[idx].setdefault("ward_no", "")
            issues[idx].setdefault("lat", None)
            issues[idx].setdefault("lon", None)
            skipped += 1
            continue

        # Step 2: Geocode
        geo = geocode_area(extracted, geo_cache)
        if not geo:
            print(f"  → Could not geocode '{extracted}'")
            issues[idx]["area"] = extracted  # still update area text
            issues[idx].setdefault("ward_name", "")
            issues[idx].setdefault("ward_no", "")
            skipped += 1
            continue

        print(f"  → lat={geo['lat']:.4f} lon={geo['lon']:.4f} candidates={geo['candidates']}")

        # Step 3: Ward match
        ward = match_ward(geo["candidates"], wards, area_lookup)

        issues[idx]["area"] = extracted
        issues[idx]["lat"] = geo["lat"]
        issues[idx]["lon"] = geo["lon"]
        issues[idx]["ward_name"] = ward["ward_name"] if ward else ""
        issues[idx]["ward_no"] = ward["ward_no"] if ward else ""

        if ward:
            print(f"  → Ward: {ward['ward_name']} (#{ward['ward_no']})")
            updated += 1
        else:
            print(f"  → No ward match")
            skipped += 1

        # Persist cache every 20 issues so progress is not lost
        if (i + 1) % 20 == 0:
            save_json(GEO_CACHE_FILE, geo_cache)
            save_json(ISSUES_FILE, issues)
            print(f"  [checkpoint saved]")

    # Final save
    save_json(GEO_CACHE_FILE, geo_cache)
    save_json(ISSUES_FILE, issues)

    print(f"\nDone. Ward-matched: {updated} | No location found: {skipped}")
    print("Next step: git add data/issues.json data/geo_cache.json && git commit")


if __name__ == "__main__":
    main()
