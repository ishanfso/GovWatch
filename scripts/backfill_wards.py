"""
GovWatch -- Ward Backfill Script
Keyword-based (no LLM/API) backfill of ward_name/ward_no for issues without ward data.

Strategy:
  1. For issues with a specific area (not "Bangalore"): use AREA_TO_WARD + trigram match.
  2. For issues with area == "Bangalore": scan tweet text for all 369 ward names
     and all AREA_TO_WARD keys (case-insensitive substring match).

Usage:
  python backfill_wards.py

Reads:  data/issues.json, data/officials/wards.json
Writes: data/issues.json (updated in-place)
"""

import json
import os
import re

ISSUES_FILE = os.path.join(os.path.dirname(__file__), "../data/issues.json")
WARDS_FILE  = os.path.join(os.path.dirname(__file__), "../data/officials/wards.json")

# ---------------------------------------------------------------------------
# Geographically verified area -> canonical ward name mapping (same as
# process_issues.py and filter_issues.py -- must stay in sync).
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
    "old airport road":  "Indiranagar",
    "airport road":      "Indiranagar",
    "cunningham road":   "Shivajinagar",
    "residency road":    "Shivajinagar",
    "rt nagar":          "R T Nagar",
    "nagarbhavi":        "Rajajinagara",
}


def trigram_sim(a, b):
    """Jaccard similarity on character trigrams."""
    def tg(s):
        s = s.lower()
        return {s[i:i+3] for i in range(len(s) - 2)} if len(s) >= 3 else {s}
    ta, tb = tg(a), tg(b)
    return len(ta & tb) / len(ta | tb) if (ta | tb) else 0


def load_wards():
    with open(WARDS_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_ward_for_area(area, wards):
    """
    Return (ward_name, ward_no) for a given area string.
    Pass 1: AREA_TO_WARD dict (exact lowercase key match).
    Pass 2: trigram similarity against all 369 ward names (threshold 0.4).
    """
    if not area or area.lower() in ("bangalore", "bengaluru", ""):
        return "", ""

    lc = area.lower().strip()

    ward_name = AREA_TO_WARD.get(lc)
    if ward_name:
        for w in wards:
            if w["ward_name"] == ward_name:
                return w["ward_name"], w["ward_no"]

    best, best_score = None, 0.40
    for w in wards:
        score = trigram_sim(lc, w["ward_name"].lower())
        if score > best_score:
            best_score = score
            best = w
    if best:
        return best["ward_name"], best["ward_no"]

    return "", ""


def scan_text_for_area(text, wards):
    """
    For a "Bangalore"-tagged issue, scan tweet text for:
      1. Any AREA_TO_WARD key (longest match wins to prefer "sarjapur road" over "sarjapur")
      2. Any ward name from wards.json (case-insensitive substring)
    Returns (area_name, ward_name, ward_no) or ("", "", "") if nothing found.
    """
    lower = text.lower()

    # Build ward name lookup dict
    ward_by_name = {w["ward_name"].lower(): w for w in wards}

    # Pass 1: check AREA_TO_WARD keys -- longer keys first to get most specific match
    matched_area = ""
    matched_ward_name = ""
    matched_ward_no = ""
    for key in sorted(AREA_TO_WARD.keys(), key=len, reverse=True):
        # Use word-boundary style check: key must not be part of a longer word
        pattern = r'(?<![a-z])' + re.escape(key) + r'(?![a-z])'
        if re.search(pattern, lower):
            ward_name_target = AREA_TO_WARD[key]
            for w in wards:
                if w["ward_name"] == ward_name_target:
                    matched_area = key.title()  # Human-readable area name
                    matched_ward_name = w["ward_name"]
                    matched_ward_no = w["ward_no"]
                    return matched_area, matched_ward_name, matched_ward_no

    # Pass 2: check ward names directly in text
    # Sort by length descending so longer/more-specific names match first
    for wname_lower, w in sorted(ward_by_name.items(), key=lambda x: -len(x[0])):
        if len(wname_lower) < 4:  # Skip very short names to avoid false positives
            continue
        pattern = r'(?<![a-z])' + re.escape(wname_lower) + r'(?![a-z])'
        if re.search(pattern, lower):
            return w["ward_name"], w["ward_name"], w["ward_no"]

    return "", "", ""


def backfill():
    print("Loading data...")
    with open(ISSUES_FILE, encoding="utf-8") as f:
        issues = json.load(f)
    wards = load_wards()

    print(f"  {len(issues)} issues, {len(wards)} wards")

    # Baseline stats
    already_has_ward = sum(1 for i in issues if i.get("ward_name"))
    no_ward_specific = [i for i in issues if not i.get("ward_name") and i.get("area", "Bangalore") != "Bangalore"]
    no_ward_bangalore = [i for i in issues if not i.get("ward_name") and i.get("area", "Bangalore") == "Bangalore"]

    print(f"\nBefore backfill:")
    print(f"  Has ward_name:         {already_has_ward}")
    print(f"  No ward, specific area:{len(no_ward_specific)}")
    print(f"  No ward, area=Bangalore:{len(no_ward_bangalore)}")

    # --- Pass 1: Specific area issues ---
    pass1_fixed = 0
    pass1_failed = []
    for issue in no_ward_specific:
        area = issue.get("area", "")
        ward_name, ward_no = get_ward_for_area(area, wards)
        if ward_name:
            issue["ward_name"] = ward_name
            issue["ward_no"] = ward_no
            pass1_fixed += 1
        else:
            pass1_failed.append(area)

    # --- Pass 2: "Bangalore" area -- scan tweet text ---
    pass2_fixed = 0
    pass2_area_updated = 0
    pass2_failed = 0
    for issue in no_ward_bangalore:
        area, ward_name, ward_no = scan_text_for_area(issue["text"], wards)
        if ward_name:
            issue["ward_name"] = ward_name
            issue["ward_no"] = ward_no
            if area:
                issue["area"] = area
                pass2_area_updated += 1
            pass2_fixed += 1
        else:
            pass2_failed += 1

    # Save
    with open(ISSUES_FILE, "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)

    # Final stats
    final_has_ward = sum(1 for i in issues if i.get("ward_name"))
    total_fixed = pass1_fixed + pass2_fixed

    print(f"\nBackfill complete:")
    print(f"  Pass 1 (specific area -> ward): {pass1_fixed} fixed")
    if pass1_failed:
        from collections import Counter
        print(f"  Pass 1 still unmatched areas: {Counter(pass1_failed).most_common(10)}")
    print(f"  Pass 2 (Bangalore -> text scan): {pass2_fixed} fixed ({pass2_area_updated} also got specific area)")
    print(f"  Pass 2 still unmatched: {pass2_failed}")
    print(f"\nAfter backfill:")
    print(f"  Has ward_name: {final_has_ward} / {len(issues)} ({100*final_has_ward//len(issues)}%)")
    print(f"  Total newly assigned: {total_fixed}")
    print(f"\nSaved to {ISSUES_FILE}")


if __name__ == "__main__":
    backfill()
