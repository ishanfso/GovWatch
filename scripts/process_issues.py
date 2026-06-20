"""
GovWatch — Issue Processing Script
Categorizes raw tweets into civic issue types, assigns severity, extracts area.
Uses a curated AREA_TO_WARD dict (geographically verified) + trigram fallback to
assign ward_name/ward_no. Preserves existing ward enrichment from issues.json
(ward_name, ward_no, lat, lon) so manually-enriched data is never wiped.

Usage:
  python process_issues.py

Reads:  data/raw_tweets.json  (created by fetch_tweets.py)
Writes: data/issues.json      (read by the dashboard)
"""

import json
import os
import re
from datetime import datetime

RAW_FILE    = os.path.join(os.path.dirname(__file__), "../data/raw_tweets.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/issues.json")
WARDS_FILE  = os.path.join(os.path.dirname(__file__), "../data/officials/wards.json")

# ---------------------------------------------------------------------------
# Geographically verified area -> canonical ward name mapping.
# Keys are lowercase; values are exact ward_name strings from wards.json.
# Do NOT use area_ward_lookup.json -- it contains wrong entries.
# ---------------------------------------------------------------------------
AREA_TO_WARD = {
    "koramangala":       "Koramangala East",
    "indiranagar":       "Indiranagar",
    "whitefield":        "Whitefield",
    "jayanagar":         "Jayanagar East",
    "jayanagar east":    "Jayanagar East",
    "hsr layout":        "HSR Layout",
    "hsr":               "HSR Layout",
    "btm layout":        "RBI Layout",
    "btm":               "RBI Layout",
    "marathahalli":      "Marathahalli",
    "sarjapur":          "Anjanapura",
    "sarjapur road":     "Bellandur",
    "electronic city":   "Bommanahalli",
    "hebbal":            "Hebbal",
    "malleshwaram":      "Malleshwaram",
    "malleswaram":       "Malleshwaram",
    "rajajinagar":       "Rajajinagara",
    "girinagar":         "Rajajinagara",
    "nagarbhavi":        "Rajajinagara",
    "rr nagar":          "Rajajinagara",
    "jp nagar":          "J.P Nagar",
    "jpnagar":           "J.P Nagar",
    "bannerghatta":      "Gottigere",
    "bannerghatta road": "Gottigere",
    "yelahanka":         "Yelahanka Old Town",
    "mg road":           "Shivajinagar",
    "cubbon park":       "J.P Park",
    "lalbagh":           "J.P Park",
    "kr puram":          "K R Pura",
    "kr pura":           "K R Pura",
    "k r pura":          "K R Pura",
    "old madras road":   "K R Pura",
    "bellandur":         "Bellandur",
    "outer ring road":   "Bellandur",
    "orr":               "Bellandur",
    "haralur":           "Bellandur",
    "domlur":            "Domlur",
    "madiwala":          "Madiwala",
    "basavanagudi":      "Basavanapura",
    "vijayanagar":       "Vinayakanagar",
    "yeshwantpur":       "Yeshwanthpura",
    "peenya":            "Peenya",
    "peenya industrial": "Peenya",
    "tumkur road":       "Peenya",
    "bommanahalli":      "Bommanahalli",
    "bommasandra":       "Bommanahalli",
    "nagawara":          "Nagavara",
    "nagavara":          "Nagavara",
    "nayandahalli":      "Nayanda Halli",
    "chikkalsandra":     "Chikkalasandra",
    "chikkalasandra":    "Chikkalasandra",
    "rt nagar":          "R T Nagar",
    "r t nagar":         "R T Nagar",
    "kammanahalli":      "Kammanahalli",
    "kalyan nagar":      "Kalyanagar",
    "banaswadi":         "Kalyanagar",
    "hbr layout":        "HBR Layout",
    "hongasandra":       "Hongasandra",
    "hulimavu":          "Hulimavu",
    "begur":             "Beguru",
    "gottigere":         "Gottigere",
    "singasandra":       "Singasandra",
    "cox town":          "Cox Town",
    "benson town":       "Cox Town",
    "frazer town":       "Cox Town",
    "richards town":     "Cox Town",
    "ulsoor":            "Indiranagar",
    "ejipura":           "Koramangala East",
    "koramangala east":  "Koramangala East",
    "manyata":           "Hebbal",
    "itpl":              "Whitefield",
    "padmanabha nagar":  "Padmanabhanagar",
    "padmanabhanagar":   "Padmanabhanagar",
    "channasandra":      "Channasandra",
    "k.channasandra":    "Channasandra",
    "k channasandra":    "Channasandra",
    "devanahalli":       "Yelahanka Old Town",
    "majestic":          "Sampangirama Nagar",
    "shivajinagar":      "Shivajinagar",
    "shivaji nagar":     "Shivajinagar",
    "austin town":       "Austin Town",
    "vasanthnagar":      "Sampangirama Nagar",
    "gandhinagar":       "Gandhi Nagar",
    "gandhi nagar":      "Gandhi Nagar",
    "mysore road":       "Kengeri",
    "kengeri":           "Kengeri",
}

# Keyword rules for each category (order matters -- first match wins)
CATEGORY_RULES = {
    "Flooding": [
        "waterlog", "flood", "submerge", "storm drain", "inundat",
        "rainwater", "rain water", "sewage overflow", "overflowing drain",
    ],
    "Electricity": [
        "power cut", "power outage", "no power", "no electricity",
        "bescom", "transformer", "street light", "load shedding", "power failure",
    ],
    "Water": [
        "bwssb", "water supply", "no water", "water cut", "water pipe",
        "water tanker", "borewell", "water leak", "pipe burst", "water pressure",
    ],
    "Roads": [
        "pothole", "road damage", "road condition", "digging", "road repair",
        "footpath", "pavement", "speed breaker", "road cave", "road broken",
        "crater", "road dug", "road work", "bbmp road",
    ],
    "Waste": [
        "garbage", "waste", "trash", "dump", "swm", "solid waste",
        "debris", "litter", "stray", "door step collection",
    ],
    "Parks": [
        "park", "garden", "lalbagh", "cubbon", "lake", "tree fell",
        "tree cutting", "green space", "horticulture",
    ],
    "Traffic": [
        "traffic signal", "traffic light", "traffic jam", "traffic block",
        "bmtc", "bus route", "metro", "commute", "congestion",
    ],
}

# Bangalore areas -- used to extract location from tweet text
BANGALORE_AREAS = [
    "Koramangala", "Indiranagar", "Whitefield", "Jayanagar", "HSR Layout",
    "BTM Layout", "Marathahalli", "Sarjapur", "Electronic City", "Hebbal",
    "Malleshwaram", "Rajajinagar", "JP Nagar", "Bannerghatta", "Yelahanka",
    "MG Road", "Cubbon Park", "Lalbagh", "KR Puram", "Lavelle Road",
    "Bellandur", "Hoskote", "Anekal", "Domlur", "Madiwala",
    "Basavanagudi", "Vijayanagar", "Yeshwantpur", "Peenya", "Tumkur Road",
    "Outer Ring Road", "ORR", "ITPL", "Manyata", "Nagawara",
    "RT Nagar", "Kalyan Nagar", "HBR Layout", "Kammanahalli",
    "Cox Town", "Benson Town", "Frazer Town", "Richards Town",
    "KG Nagar", "Padmanabha Nagar", "Girinagar", "Kumaraswamy Layout",
    "Electronic City", "Bommanahalli", "Hongasandra", "Hulimavu",
    "Begur", "Gottigere", "Bannerghatta Road",
]


def load_wards():
    """Load all 369 wards from wards.json."""
    try:
        with open(WARDS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


WARDS = load_wards()


def trigram_sim(a, b):
    """Jaccard similarity on character trigrams."""
    def tg(s):
        s = s.lower()
        return {s[i:i+3] for i in range(len(s) - 2)} if len(s) >= 3 else {s}
    ta, tb = tg(a), tg(b)
    return len(ta & tb) / len(ta | tb) if (ta | tb) else 0


def get_ward_for_area(area, wards):
    """
    Return (ward_name, ward_no) for a given area string.
    Strategy:
      1. Exact/lowercase match in AREA_TO_WARD dict (geographically verified)
      2. Trigram similarity fallback against all 369 ward names (threshold 0.4)
    Returns ('', '') if no match found or area is generic.
    """
    if not area or area.lower() in ("bangalore", "bengaluru", ""):
        return "", ""

    lc = area.lower().strip()

    # Pass 1 -- curated mapping
    ward_name = AREA_TO_WARD.get(lc)
    if ward_name:
        for w in wards:
            if w["ward_name"] == ward_name:
                return w["ward_name"], w["ward_no"]

    # Pass 2 -- trigram fallback (threshold 0.4)
    best, best_score = None, 0.40
    for w in wards:
        score = trigram_sim(lc, w["ward_name"].lower())
        if score > best_score:
            best_score = score
            best = w
    if best:
        return best["ward_name"], best["ward_no"]

    return "", ""


def categorize(text):
    lower = text.lower()
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in lower:
                return category
    return "Other"


def extract_area(text):
    for area in BANGALORE_AREAS:
        if area.lower() in text.lower():
            return area
    return "Bangalore"


def extract_keywords(text, category):
    found = []
    lower = text.lower()
    if category in CATEGORY_RULES:
        for kw in CATEGORY_RULES[category]:
            if kw in lower:
                found.append(kw)
    return found[:5]


def severity(likes, retweets):
    total = likes + retweets
    if total >= 50:
        return "high"
    if total >= 10:
        return "medium"
    return "low"


def process():
    if not os.path.exists(RAW_FILE):
        print(f"ERROR: {RAW_FILE} not found. Run fetch_tweets.py first.")
        return

    # Load existing issues to preserve manually-enriched ward data
    existing_ward_cache = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, encoding="utf-8") as f:
                for issue in json.load(f):
                    if issue.get("ward_name"):
                        existing_ward_cache[issue["id"]] = {
                            "area":      issue.get("area", ""),
                            "ward_name": issue["ward_name"],
                            "ward_no":   issue.get("ward_no", ""),
                            "lat":       issue.get("lat"),
                            "lon":       issue.get("lon"),
                        }
        except Exception:
            pass

    print(f"Preserved ward cache: {len(existing_ward_cache)} tweets with existing ward data")

    with open(RAW_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    issues = []
    cache_hits = 0
    new_lookups = 0

    for tweet in raw:
        category = categorize(tweet["text"])
        area = extract_area(tweet["text"])

        cached = existing_ward_cache.get(tweet["id"])
        if cached:
            # Preserve enriched ward data; prefer cached area if it's more specific
            area      = cached["area"] or area
            ward_name = cached["ward_name"]
            ward_no   = cached["ward_no"]
            lat       = cached.get("lat")
            lon       = cached.get("lon")
            cache_hits += 1
        else:
            ward_name, ward_no = get_ward_for_area(area, WARDS)
            lat = lon = None
            new_lookups += 1

        issues.append({
            "id":         tweet["id"],
            "text":       tweet["text"],
            "author":     tweet["author"],
            "date":       tweet["date"],
            "category":   category,
            "area":       area,
            "ward_name":  ward_name,
            "ward_no":    ward_no,
            "lat":        lat,
            "lon":        lon,
            "severity":   severity(tweet.get("likes", 0), tweet.get("retweets", 0)),
            "likes":      tweet.get("likes", 0),
            "retweets":   tweet.get("retweets", 0),
            "source_url": tweet.get("source_url", ""),
            "keywords":   extract_keywords(tweet["text"], category),
            "status":     "open",
        })

    # Sort by severity then engagement
    severity_order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda x: (severity_order[x["severity"]], -(x["likes"] + x["retweets"])))

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)

    cats = {}
    for iss in issues:
        cats[iss["category"]] = cats.get(iss["category"], 0) + 1

    print(f"Processed {len(issues)} issues -> {OUTPUT_FILE}")
    print(f"  Cache hits (ward preserved): {cache_hits}")
    print(f"  New ward lookups:            {new_lookups}")
    has_ward = sum(1 for i in issues if i.get("ward_name"))
    print(f"  Issues with ward_name:       {has_ward}")
    print("Category breakdown:")
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    print("\nDashboard will load live data on next refresh.")


if __name__ == "__main__":
    process()
