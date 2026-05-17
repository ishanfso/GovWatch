"""
GovWatch — Issue Processing Script
Categorizes raw tweets into civic issue types, assigns severity, extracts area.

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

# Bangalore areas — used to extract location from tweet text
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


def categorize(text: str) -> str:
    lower = text.lower()
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in lower:
                return category
    return "Other"


def extract_area(text: str) -> str:
    for area in BANGALORE_AREAS:
        if area.lower() in text.lower():
            return area
    return "Bangalore"


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
        issues.append({
            "id": tweet["id"],
            "text": tweet["text"],
            "author": tweet["author"],
            "date": tweet["date"],
            "category": category,
            "area": area,
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
