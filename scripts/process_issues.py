"""
GovWatch — Issue Processing Script
Categorizes raw tweets into civic issue types, assigns severity, extracts area.
For areas matching the 28-entry area lookup, ward_name and ward_no are stored
immediately. Remaining "Bangalore"-tagged issues should be enriched by running
enrich_locations.py afterwards.

Usage:
  python process_issues.py

Reads:  data/raw_tweets.json  (created by fetch_tweets.py)
Writes: data/issues.json      (read by the dashboard)
"""

import json
import os
import re
from datetime import datetime

RAW_FILE = os.path.join(os.path.dirname(__file__), "../data/raw_tweets.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/issues.json")
AREA_LOOKUP_FILE = os.path.join(os.path.dirname(__file__), "../data/officials/area_ward_lookup.json")
WARDS_FILE = os.path.join(os.path.dirname(__file__), "../data/officials/wards.json")

# Keyword rules for each category (order matters — first match wins)
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

# Bangalore area names — built at startup from ward + BESCOM data + manual aliases.
# Sorted longest-first so "BTM Layout" matches before "BTM", "Electronic City" before "City", etc.
# Falls back to pincode lookup (560xxx) if no name match.

MANUAL_AREA_ALIASES = [
    "Koramangala", "Indiranagar", "Whitefield", "Jayanagar", "HSR Layout",
    "BTM Layout", "Marathahalli", "Sarjapur", "Electronic City", "Hebbal",
    "Malleshwaram", "Rajajinagar", "JP Nagar", "Bannerghatta", "Yelahanka",
    "MG Road", "Cubbon Park", "Lalbagh", "KR Puram", "Lavelle Road",
    "Bellandur", "Hoskote", "Anekal", "Domlur", "Madiwala",
    "Basavanagudi", "Vijayanagar", "Yeshwantpur", "Peenya", "Nagawara",
    "RT Nagar", "Kalyan Nagar", "HBR Layout", "Kammanahalli",
    "Cox Town", "Benson Town", "Frazer Town", "Richards Town",
    "KG Nagar", "Padmanabha Nagar", "Girinagar", "Kumaraswamy Layout",
    "Bommanahalli", "Hongasandra", "Hulimavu", "Begur", "Gottigere",
    "Jakkur", "Singasandra", "Halehalli", "Mahadevapura", "Mahadevpura",
    "Chandapura", "Narayanapura", "Shivajinagar", "Gandhinagar",
    "Hennur", "Horamavu", "Thanisandra", "Bhattarahalli", "Varthur",
    "Kengeri", "Uttarahalli", "Banashankari", "Wilson Garden",
    "Shanthinagar", "CV Raman Nagar", "Ramamurthy Nagar", "Banaswadi",
    "Byrathi", "Kothanur", "Amruthahalli", "Jalahalli", "Mathikere",
    "Sahakara Nagar", "Sanjay Nagar", "Kaggadasapura", "Munnekolala",
    "Munnekollala", "Brookefield", "Doddanekundi", "Devanahalli",
    "Basavanagar", "Austin Town", "Ulsoor", "Richmond Town",
    "Shivaji Nagar", "HAL", "Lakshmipura", "Nagarbhavi",
    "Nayandahalli", "RR Nagar", "Rajarajeshwari Nagar",
    "Abbigere", "Bagalagunte", "Chikkabanavara", "Dasarahalli",
    "Maruthi Nagar", "Kasavanahalli", "ITPL", "Outer Ring Road",
    "Akshayanagara", "Mahalakshmi Layout", "Hosakerehalli",
    "Padmanabhanagar", "Yeshwanthpur", "KG Halli", "Vignan Nagar",
]

# Pincode → canonical area name (560xxx range covers Bangalore)
PINCODE_AREA = {
    "560001": "MG Road",          "560002": "Gandhinagar",      "560003": "Shivajinagar",
    "560004": "Cubbon Park",       "560005": "Ulsoor",            "560008": "Malleshwaram",
    "560009": "Rajajinagar",       "560010": "Rajajinagar",       "560011": "Rajajinagar",
    "560012": "Rajajinagar",       "560013": "Vijayanagar",       "560014": "Vijayanagar",
    "560015": "Vijayanagar",       "560016": "Basavanagudi",      "560017": "Jayanagar",
    "560018": "Jayanagar",         "560019": "Jayanagar",         "560020": "Jayanagar",
    "560021": "Padmanabhanagar",   "560022": "Banashankari",      "560023": "Banashankari",
    "560026": "Yeshwanthpur",      "560028": "Peenya",            "560029": "Mahalakshmi Layout",
    "560030": "Nagawara",          "560031": "Banaswadi",         "560032": "HBR Layout",
    "560033": "Kammanahalli",      "560034": "RT Nagar",          "560035": "Kalyan Nagar",
    "560036": "Hennur",            "560037": "Kaggadasapura",     "560038": "Domlur",
    "560040": "Indiranagar",       "560041": "Indiranagar",       "560042": "Frazer Town",
    "560043": "Shivajinagar",      "560044": "Hebbal",            "560045": "Yelahanka",
    "560046": "Nagawara",          "560047": "Malleshwaram",      "560050": "Koramangala",
    "560051": "Koramangala",       "560052": "Madiwala",          "560053": "BTM Layout",
    "560054": "Yeshwanthpur",      "560055": "Rajajinagar",       "560056": "Vijayanagar",
    "560057": "Hosakerehalli",     "560058": "Kengeri",           "560059": "Uttarahalli",
    "560060": "Girinagar",         "560061": "Padmanabhanagar",   "560062": "JP Nagar",
    "560063": "JP Nagar",          "560064": "Bannerghatta",      "560065": "Bannerghatta",
    "560066": "Electronic City",   "560067": "Electronic City",   "560068": "Singasandra",
    "560069": "Hulimavu",          "560070": "Hongasandra",       "560071": "Bommanahalli",
    "560072": "HSR Layout",        "560073": "Bellandur",         "560074": "Sarjapur",
    "560075": "Marathahalli",      "560076": "Mahadevapura",      "560077": "KR Puram",
    "560078": "Whitefield",        "560079": "Varthur",           "560080": "Whitefield",
    "560081": "Devanahalli",       "560083": "Yelahanka",         "560085": "Jakkur",
    "560086": "Hebbal",            "560087": "Thanisandra",       "560090": "Nagarbhavi",
    "560091": "RR Nagar",          "560092": "Kengeri",           "560093": "Uttarahalli",
    "560094": "Subramanyapura",    "560095": "Nagarbhavi",        "560096": "Vijayanagar",
    "560097": "Dasarahalli",       "560098": "Jalahalli",         "560100": "Yelahanka",
    "560103": "Horamavu",          "560104": "Banaswadi",
}


def _build_area_list():
    """Load ward names + BESCOM unit names at startup and merge with manual aliases."""
    areas = set(MANUAL_AREA_ALIASES)
    try:
        with open(WARDS_FILE, encoding="utf-8") as f:
            wards_data = json.load(f)
        for w in wards_data:
            if w.get("ward_name"):
                areas.add(w["ward_name"].strip())
    except Exception:
        pass
    try:
        bescom_path = os.path.join(os.path.dirname(__file__), "../data/officials/bescom_units.json")
        with open(bescom_path, encoding="utf-8") as f:
            bu = json.load(f)
        for u in bu:
            if u.get("om_unit"):
                areas.add(u["om_unit"].strip().title())
    except Exception:
        pass
    # Sort longest-first so specific names match before short sub-strings
    return sorted({a for a in areas if len(a) > 3}, key=lambda x: -len(x))


BANGALORE_AREAS = _build_area_list()


def categorize(text: str) -> str:
    lower = text.lower()
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in lower:
                return category
    return "Other"


def extract_area(text: str) -> str:
    tl = text.lower()
    # 1. Area name match (longest-first to avoid sub-string shadowing)
    for area in BANGALORE_AREAS:
        if area.lower() in tl:
            return area
    # 2. Pincode fallback
    m = re.search(r'\b(560\s*\d{3})\b', text)
    if m:
        pin = m.group(1).replace(" ", "")
        if pin in PINCODE_AREA:
            return PINCODE_AREA[pin]
    return "Bangalore"


def load_ward_lookup():
    """Build area→ward mapping from static JSON files (high-confidence entries only).
    Returns dict of area.lower() → (ward_name, ward_no).
    Only includes area_ward_lookup entries with match_score >= 0.8 and excludes the
    generic 'Bangalore' entry (score 0.6 → Bagalagunte, which is meaningless).
    Issues tagged 'Bangalore' need LLM enrichment via enrich_locations.py.
    """
    lookup = {}
    try:
        with open(AREA_LOOKUP_FILE, encoding="utf-8") as f:
            area_map = json.load(f)
        with open(WARDS_FILE, encoding="utf-8") as f:
            wards = json.load(f)
        ward_by_name = {w["ward_name"].lower(): w for w in wards if w.get("ward_name")}
        for area, info in area_map.items():
            if area == "Bangalore":
                continue  # too generic — skip
            if info.get("match_score", 0) < 0.8:
                continue  # low-confidence mapping — skip
            w = ward_by_name.get(info["ward_name"].lower())
            if w:
                lookup[area.lower()] = (w["ward_name"], w["ward_no"])
    except Exception:
        pass
    return lookup


WARD_LOOKUP = load_ward_lookup()


def get_ward(area: str):
    """Return (ward_name, ward_no) for a known area, or ('', '') if unknown."""
    return WARD_LOOKUP.get(area.lower(), ("", ""))


def extract_keywords(text: str, category: str) -> list:
    found = []
    lower = text.lower()
    if category in CATEGORY_RULES:
        for kw in CATEGORY_RULES[category]:
            if kw in lower:
                found.append(kw)
    return found[:5]


def severity(likes: int, retweets: int) -> str:
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

    with open(RAW_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    issues = []
    for tweet in raw:
        category = categorize(tweet["text"])
        area = extract_area(tweet["text"])
        ward_name, ward_no = get_ward(area)
        issues.append({
            "id": tweet["id"],
            "text": tweet["text"],
            "author": tweet["author"],
            "date": tweet["date"],
            "category": category,
            "area": area,
            "ward_name": ward_name,
            "ward_no": ward_no,
            "severity": severity(tweet.get("likes", 0), tweet.get("retweets", 0)),
            "likes": tweet.get("likes", 0),
            "retweets": tweet.get("retweets", 0),
            "source_url": tweet.get("source_url", ""),
            "keywords": extract_keywords(tweet["text"], category),
            "status": "open",
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

    print(f"Processed {len(issues)} issues → {OUTPUT_FILE}")
    print("Category breakdown:")
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    print("\nDashboard will load live data on next refresh.")


if __name__ == "__main__":
    process()
