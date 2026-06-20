"""
retry_geocode.py — LLM-assisted retry for ALL failed Nominatim lookups in geo_cache.json.

Handles all failure categories found in the cache:
  1. OCR artifacts  — spaces in wrong places: "byatarayanap ura" → "Byatarayanapura"
  2. Abbreviations  — "hgr", "llr", "bsk ii stage" → expanded place names
  3. Real places    — misspellings like "cooks town", "govindrajnagar" → LLM variants
  4. Admin offices  — "acp planning", "north sub division office" → not geocodable, skip
  5. O&M codes      — "o&m -i", "o&m -ii" → operational codes, skip

For categories 1-3, tries:
  a) Direct retry with "name, Bangalore Karnataka India"
  b) Pre-processed name (OCR fix, known expansions)
  c) LLM generates 4 spelling/transliteration variants → tries each

Permanently marks non-geocodable entries with {"skip": true} so re-runs skip them.

Requirements: ANTHROPIC_API_KEY in scripts/config.py or environment

Run from GovWatch root:
    python scripts/retry_geocode.py

After this completes, re-run:
    python scripts/enrich_bescom_bwssb.py
"""

import json
import os
import re
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

# ── Known abbreviations ───────────────────────────────────────────────────────
# Map bare name (lowercase, no suffix) → expanded search term
KNOWN_EXPANSIONS = {
    "hgr":    "Hanumanthanagar Bangalore",
    "llr":    "Lalbagh Road Bangalore",
    "clr":    "Chickpet Lalbagh Road Bangalore",
    "cooks town":    "Cooke Town Bangalore",
    "cotton pet":    "Cottonpete Bangalore",
    "cubbon pet":    "Cubbonpet Bangalore",
    "bsk ii stage":  "Banashankari 2nd Stage Bangalore",
    "bsk":           "Banashankari Bangalore",
    "bannergata":    "Bannerghatta Bangalore",
    "marthalli":     "Marathahalli Bangalore",
    "yashwanthpur":  "Yeshwanthpur Bangalore",
    "msnagar":       "M S Nagar Bangalore",
    "tanisandra":    "Thanisandra Bangalore",
    "govindrajnagar":"Govindraj Nagar Bangalore",
    "naagarabhavi":  "Nagarbhavi Bangalore",
    "sampangiram nagar": "Sampangi Rama Nagar Bangalore",
    "talaghattapura":"Talaghattapura Bangalore",
    "kaggadaspura":  "Kaggadasapura Bangalore",
    "kadubesanhalli":"Kadubesanahalli Bangalore",
    "chinnapahalli": "Chinnappanahalli Bangalore",
    "munnekollal":   "Munnekolala Bangalore",
    "munnekollala":  "Munnekolala Bangalore",
    "munnekolalu":   "Munnekolala Bangalore",
    "d.jhalli":      "Dasarahalli Bangalore",
    "b narayanpura": "B Narayanapura Bangalore",
    "k naryanpura":  "K Narayanapura Bangalore",
    "thubrahalli":   "Thubarahalli Bangalore",
    "srinivasnagar": "Srinivasa Nagar Bangalore",
    "saraswathinagar": "Saraswathipuram Bangalore",
    "bhyraveshwara nagar": "Bhairaveswara Nagar Bangalore",
    "jigni":         "Jigani Bangalore",
    "attibale":      "Attibele Bangalore",
    "bannappa park": "Bannappa Park Bangalore",
    "hombegowda nagara": "Hombegowda Nagar Bangalore",
    "hebbal guddahalli": "Guddahalli Hebbal Bangalore",
    "vignan nagar":  "Vignana Nagar Bangalore",
    "virgo nagar":   "Virgo Nagar Bangalore",
    "weaver colony": "Weaver Colony Bangalore",
    "jagdish nagar": "Jagdish Nagar Bangalore",
    "jakkur village":"Jakkur Bangalore",
    "pillanagarden": "Pillanna Garden Bangalore",
    "pillanna garden":"Pillanna Garden Bangalore",
    "kengeri park road": "Kengeri Bangalore",
    "aishwarya crystal layout": "Aishwarya Crystal Layout Bangalore",
    "chiranjeevi layout": "Chiranjeevi Layout Bangalore",
    "chowrappa layout": "Chowrappa Layout Bangalore",
    "dominic layout": "Dominic Layout Bangalore",
    "dns layout":    "DNS Layout Bangalore",
    "rhcs layout":   "RHCS Layout Bangalore",
    "ramesh reddy layout": "Ramesh Reddy Layout Bangalore",
    "red carpet layout": "Red Carpet Layout Bangalore",
    "sannidhi enclave": "Sannidhi Enclave Bangalore",
    "mittaganahalli": "Mittaganahalli Bangalore",
    "pragatipura":   "Pragatipura Bangalore",
    "reva circle":   "Reva Circle Bangalore",
    "shanthipura":   "Shanthipura Bangalore",
    "shantinetan layout": "Shantiniketan Layout Bangalore",
    "somasandara palya": "Somasundara Palya Bangalore",
    "new gurupanpalya": "Guru Nanak Palya Bangalore",
    "annayappakare": "Annayappakare Bangalore",
    "aswathnagar":   "Ashwath Nagar Bangalore",
    "avalhalli":     "Avalahalli Bangalore",
    "babusapalya":   "Babusapalya Bangalore",
    "mylasandra ramesh reddy layout": "Mylasandra Bangalore",
    "narullahalli":  "Narullahalli Bangalore",
    "kithaganur":    "Kithaganur Bangalore",
    "sri venkateshpura layout": "Venkateshpura Bangalore",
    "puttapa layout":"Puttappa Layout Bangalore",
}

# ── Patterns that are NOT geocodable (admin office titles, O&M codes) ─────────
NON_PLACE_PATTERNS = [
    # BESCOM O&M operational codes — not geocodable place names
    r"^o&m",
    r"bstation$",
    r"cstation$",

    # Traffic administrative offices / subdivisions — not a physical PS location
    r"sub division office",
    r"^office of the",
    r"^north sub division",
    r"^south sub division",
    r"^east sub division",
    r"^west sub division",
    r"^acp (planning|tr|traffic)",
    r"^dcp ",
    r"^deputy commissioner of police",
    r"^traffic (south|north|east|west|northeast|southeast) (division|sub division)",
    r"^tr (south|north|east|west) (sub|office|division)",
    r"^tr whitefield sub",
    r"^tr hsr layout sub",
    r"acp vijaynagara trafic sub",
    r"^j b ngara tr ps",
    r"^k r pura tr$",

    # BESCOM/BWSSB section names (administrative, not geographic points)
    r"^central section",
    r"^north section",
    r"^south section",
    r"^west section",

    # Multi-area slash entries — ambiguous, skip
    r"^banashankari / padmanabha nagara",
    r"^challakere / horamavu",
    r"^devasandra service station / k r puram",
    r"^hal airport/marathalli",
    r"^ittamadu / devagiri",
    r"^kumaraswamy layout stage",
    r"^magadi road 1/ magadi road 2",
    r"^mnk / basavanagudi",
    r"^nagendra block / girinagar",
    r"^narayan nagar & gottigerew",
    r"^vv puram / k.g.nagar",

    # Garbage / out-of-city / prompt artifacts
    r"toll gate near parle",
    r"i need to identify",
    r"^vashi$",
    r"^vashi bridge$",
    r"\(cid:\d+\)",                   # HTML encoding artifacts in source data
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
        "q": place, "format": "json", "limit": 1, "countrycodes": "in",
    })
    req = urllib.request.Request(
        "{0}?{1}".format(NOMINATIM_URL, params),
        headers={"User-Agent": USER_AGENT},
    )
    try:
        _last_nominatim = time.time()
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read())
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print("    [nominatim error] {0}".format(e))
    return None


def get_llm_variants(bare_name):
    """Ask Claude Haiku for 4 Bangalore-specific geocodable name variants."""
    if not ANTHROPIC_KEY:
        return []
    prompt = (
        "The following place name in Bangalore, India failed to geocode on OpenStreetMap Nominatim: {0!r}\n\n"
        "Generate exactly 4 alternative search terms — try different spellings, common transliterations, "
        "official BBMP ward names, or well-known area names that would match this location. "
        "Each should end with ', Bangalore'. "
        "Output ONLY a JSON array of 4 strings, nothing else.\n"
        "Example: [\"Marathahalli, Bangalore\", \"Marathalli, Bangalore\", "
        "\"Marath Halli Outer Ring Road, Bangalore\", \"Marathahalli Bridge, Bangalore\"]"
    ).format(bare_name)
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        ANTHROPIC_URL, data=payload,
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
        start, end = text.find("["), text.rfind("]") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except Exception as e:
        print("    [LLM error] {0}".format(e))
    return []


def bare_name(key):
    """Strip ', bangalore, karnataka' suffix to get the raw place name."""
    s = key
    for suffix in [", bangalore, karnataka", ", bangalore", ", karnataka"]:
        if s.endswith(suffix):
            s = s[: -len(suffix)]
            break
    return s.strip()


def fix_ocr_spaces(name):
    """Remove spaces that split words mid-syllable (OCR artifact).

    Pattern: lowercase letter, space, 1-3 lowercase letters, space OR end.
    e.g. 'byatarayanap ura' → 'byatarayanapura'
         'chandapu ra'      → 'chandapura'
    """
    fixed = re.sub(r'([a-z]) ([a-z]{1,3})(\b)', lambda m: m.group(1) + m.group(2) + m.group(3), name)
    # Also handle patterns like 'govindapur a' → 'govindapura'
    fixed = re.sub(r'([a-z]{4,}) ([a-z]{1,3})$', lambda m: m.group(1) + m.group(2), fixed)
    return fixed


def is_non_place(key):
    lk = key.lower()
    return any(re.search(p, lk) for p in NON_PLACE_PATTERNS)


def try_geocode_sequence(key, label=""):
    """Try multiple queries for a key. Return (lat, lon) on first success or None."""
    b = bare_name(key).lower()

    # 1. Known expansion
    if b in KNOWN_EXPANSIONS:
        result = nominatim_query(KNOWN_EXPANSIONS[b])
        if result:
            print("    -> known expansion: {0!r}".format(KNOWN_EXPANSIONS[b]))
            return result

    # 2. OCR space fix
    fixed = fix_ocr_spaces(b)
    if fixed != b:
        result = nominatim_query("{0}, Bangalore Karnataka India".format(fixed.title()))
        if result:
            print("    -> OCR fix: {0!r}".format(fixed))
            return result

    # 3. Direct retry with tighter scope
    result = nominatim_query("{0}, Bangalore Karnataka India".format(b.title()))
    if result:
        print("    -> direct retry succeeded")
        return result

    # 4. LLM variants
    variants = get_llm_variants(b)
    if variants:
        print("    -> LLM variants: {0}".format(variants))
    for v in variants:
        result = nominatim_query(v)
        if result:
            print("    -> SUCCESS with: {0!r}".format(v))
            return result

    return None


def main():
    if not ANTHROPIC_KEY:
        print("ERROR: ANTHROPIC_API_KEY not found.")
        print("Set it in scripts/config.py or export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    cache = load_cache()

    # Partition cache entries
    all_failed  = [k for k, v in cache.items() if v is None]
    already_skipped = [k for k, v in cache.items()
                       if isinstance(v, dict) and v.get("skip")]
    non_places  = [k for k in all_failed if is_non_place(k)]
    retryable   = [k for k in all_failed if not is_non_place(k)]

    print("=" * 60)
    print("Geo-cache retry with LLM-assisted name variants")
    print("=" * 60)
    print("  Total failures (None)    : {0}".format(len(all_failed)))
    print("  Already marked skip      : {0}".format(len(already_skipped)))
    print("  Non-place admin entries  : {0} (will mark skip)".format(len(non_places)))
    print("  Retryable place names    : {0}".format(len(retryable)))
    print()

    # Mark non-places permanently so future runs skip them
    for k in non_places:
        cache[k] = {"skip": True}
    save_cache(cache)
    print("Marked {0} admin/office entries as skip.\n".format(len(non_places)))

    resolved = 0
    still_failed = 0

    for i, key in enumerate(retryable, 1):
        print("[{0}/{1}] {2!r}".format(i, len(retryable), key))
        result = try_geocode_sequence(key)
        if result:
            cache[key] = {"lat": result[0], "lon": result[1]}
            resolved += 1
        else:
            print("    -> all attempts failed")
            still_failed += 1
        # Save after every entry so progress is not lost on interrupt
        save_cache(cache)

    print()
    print("=" * 60)
    print("Done.")
    print("  Resolved    : {0} / {1}".format(resolved, len(retryable)))
    print("  Still failed: {0}".format(still_failed))
    print("  Marked skip : {0} (admin offices / O&M codes)".format(len(non_places)))
    print()
    print("Next: re-run enrich_bescom_bwssb.py to apply corrected geocodes:")
    print("  python scripts/enrich_bescom_bwssb.py")


if __name__ == "__main__":
    main()
