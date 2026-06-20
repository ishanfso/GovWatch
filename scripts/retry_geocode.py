"""
retry_geocode.py — LLM-assisted retry for failed Nominatim lookups.

For each place in geo_cache.json with value None, this script:
  1. Asks Claude to generate 4 alternative spellings / search terms
  2. Tries each through Nominatim until one succeeds
  3. Stores the successful result under the original key in geo_cache.json

After this runs, re-run enrich_bescom_bwssb.py to pick up the corrections.

Requirements: ANTHROPIC_API_KEY in environment or scripts/config.py

Run from the GovWatch root:
    python scripts/retry_geocode.py
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

ROOT       = Path(__file__).parent.parent
CACHE_PATH = ROOT / "data/geo_cache.json"

try:
    sys.path.insert(0, str(ROOT / "scripts"))
    import config as cfg
    ANTHROPIC_KEY = getattr(cfg, "ANTHROPIC_API_KEY", None)
except ImportError:
    ANTHROPIC_KEY = None

ANTHROPIC_KEY = ANTHROPIC_KEY or os.environ.get("ANTHROPIC_API_KEY", "")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
USER_AGENT    = "GovWatch-Bangalore/1.0 (civic dashboard; contact: admin@govwatch.in)"
RATE_LIMIT    = 1.1

_last_nominatim = 0.0

# Places we know are outside Bangalore or garbage entries — skip entirely
SKIP_PATTERNS = [
    "i need to identify",
    "toll gate near parle",
    "vashi",           # Mumbai
]


def load_cache():
    if CACHE_PATH.exists():
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def nominatim_query(place):
    global _last_nominatim
    elapsed = time.time() - _last_nominatim
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
        _last_nominatim = time.time()
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read())
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print("    [nominatim error] {0}".format(e))
    return None


def get_variants(original_key):
    """Use Claude Haiku to generate 4 Bangalore-specific search term variants."""
    if not ANTHROPIC_KEY:
        return []

    # Strip the ", bangalore, karnataka" suffix if present to get the bare name
    bare = original_key
    for suffix in [", bangalore, karnataka", ", bangalore", ", karnataka"]:
        if bare.endswith(suffix):
            bare = bare[: -len(suffix)]
            break

    prompt = (
        "The following place name in Bangalore, India failed to geocode on OpenStreetMap Nominatim: {0!r}\n\n"
        "Generate exactly 4 alternative search terms for this same place — try different spellings, "
        "transliterations, or common short forms. Each should be a plain place name to search on "
        "Nominatim (include 'Bangalore' at the end of each). "
        "Output ONLY a JSON array of 4 strings, no explanation.\n"
        "Example output: [\"Marathahalli, Bangalore\", \"Marath Halli, Bangalore\", "
        "\"Marathalli, Bangalore\", \"Marathalli Bangalore Karnataka\"]"
    ).format(bare)

    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        ANTHROPIC_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read())
        text = body["content"][0]["text"].strip()
        # Extract JSON array from response
        start = text.find("[")
        end   = text.rfind("]") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except Exception as e:
        print("    [LLM error] {0}".format(e))
    return []


def should_skip(key):
    lk = key.lower()
    return any(p in lk for p in SKIP_PATTERNS)


def main():
    if not ANTHROPIC_KEY:
        print("ERROR: ANTHROPIC_API_KEY not found.")
        print("Set it in scripts/config.py or export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    cache = load_cache()
    failed = [k for k, v in cache.items() if v is None]
    skipped = [k for k in failed if should_skip(k)]
    to_retry = [k for k in failed if not should_skip(k)]

    print("Geo-cache retry with LLM-assisted name variants")
    print("  Total failures : {0}".format(len(failed)))
    print("  Skipping       : {0} (outside Bangalore or garbage)".format(len(skipped)))
    print("  Will retry     : {0}".format(len(to_retry)))
    print()

    resolved = 0
    still_failed = 0

    for i, key in enumerate(to_retry, 1):
        print("[{0}/{1}] {2!r}".format(i, len(to_retry), key))

        # First try the key as-is with a tighter Bangalore-scoped query
        bare = key
        for suffix in [", bangalore, karnataka", ", bangalore", ", karnataka"]:
            if bare.endswith(suffix):
                bare = bare[: -len(suffix)]
                break
        direct = "{0}, Bangalore Karnataka India".format(bare)
        result = nominatim_query(direct)
        if result:
            print("  -> Direct retry succeeded: {0}".format(direct))
            cache[key] = {"lat": result[0], "lon": result[1]}
            save_cache(cache)
            resolved += 1
            continue

        # Ask LLM for variants
        variants = get_variants(key)
        print("  -> LLM variants: {0}".format(variants))

        found = False
        for variant in variants:
            result = nominatim_query(variant)
            if result:
                print("  -> SUCCESS with variant {0!r}: {1}".format(variant, result))
                cache[key] = {"lat": result[0], "lon": result[1]}
                save_cache(cache)
                resolved += 1
                found = True
                break

        if not found:
            print("  -> All variants failed — marking permanently skipped")
            still_failed += 1

    print()
    print("Done.")
    print("  Resolved   : {0}".format(resolved))
    print("  Still failed: {0}".format(still_failed))
    print("  Skipped    : {0}".format(len(skipped)))
    print()
    print("Next: re-run enrich_bescom_bwssb.py to apply the corrected geocodes")


if __name__ == "__main__":
    main()
