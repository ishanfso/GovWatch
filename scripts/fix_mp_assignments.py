"""
fix_mp_assignments.py — One-time script to assign correct MP to each ward.

The wards.json constituency field uses various spellings that don't match
mps.json assemblies. This script uses a hardcoded ECI-verified mapping to
assign the correct MP to all 369 wards, then updates wards.json in place.

Run once from the GovWatch root:
    python scripts/fix_mp_assignments.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ECI-verified mapping: ward constituency spelling → Lok Sabha constituency name
# Covers both the official spelling and common variants found in wards.json
CONSTITUENCY_TO_MP = {
    # ── Bangalore North ──────────────────────────────────────────────
    "Yelahanka":            "Bangalore North",
    "K.R. Puram":           "Bangalore North",
    "Byatarayanapura":      "Bangalore North",
    "Yeshwanthapura":       "Bangalore North",
    "Dasarahalli":          "Bangalore North",
    "Mahalakshmi Layout":   "Bangalore North",
    "Malleshwaram":         "Bangalore North",
    "Hebbal":               "Bangalore North",
    "Ganganagar":           "Bangalore North",   # missing from mps.json

    # ── Bangalore Central ─────────────────────────────────────────────
    "Pulakeshinagar":       "Bangalore Central",
    "Sarvagnanagar":        "Bangalore Central",
    "C.V. Raman Nagar":     "Bangalore Central",
    "Shivajinagar":         "Bangalore Central",
    "Gandhinagara":         "Bangalore Central",   # ward spelling
    "Gandhi Nagar":         "Bangalore Central",   # mps.json spelling
    "Shanthinagar":         "Bangalore Central",   # ward spelling
    "Shanthinagara":        "Bangalore Central",   # variant
    "Shanti Nagar":         "Bangalore Central",   # mps.json spelling
    "Rajajinagar":          "Bangalore Central",   # ward spelling
    "Rajaji Nagar":         "Bangalore Central",   # mps.json spelling
    "Mahadevapura":         "Bangalore Central",

    # ── Bangalore South ───────────────────────────────────────────────
    "Chamrajapet":          "Bangalore South",     # ward spelling
    "Chamarajpet":          "Bangalore South",     # mps.json spelling
    "Chickpet":             "Bangalore South",
    "Basavanagudi":         "Bangalore South",
    "Padmanabanagar":       "Bangalore South",     # ward spelling
    "Padmanaba Nagar":      "Bangalore South",     # mps.json spelling
    "Govindrajnagar":       "Bangalore South",     # ward spelling
    "Govindraj Nagar":      "Bangalore South",     # mps.json spelling
    "Vijayanagar":          "Bangalore South",     # ward spelling
    "Vijay Nagar":          "Bangalore South",     # mps.json spelling
    "Jayanagar":            "Bangalore South",
    "BTM Layout":           "Bangalore South",
    "Bommanahalli":         "Bangalore South",
    "Rajarajeshwarinagar":  "Bangalore South",     # missing from mps.json
    "Anekal":               "Bangalore South",     # periphery ward
    "Bangalore South":      "Bangalore South",     # fallback for ~19 wards
}


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {path}")


def main():
    wards_path = ROOT / "data/officials/wards.json"
    mps_path   = ROOT / "data/officials/mps.json"

    wards = load_json(wards_path)
    mps   = load_json(mps_path)

    # Build lookup: Lok Sabha constituency name → MP record
    mp_by_ls = {mp["constituency"]: mp for mp in mps}

    assigned = 0
    skipped  = 0
    unknown  = set()

    for ward in wards:
        mla_const = ward.get("constituency", "")
        ls_name   = CONSTITUENCY_TO_MP.get(mla_const)

        if not ls_name:
            skipped += 1
            unknown.add(mla_const)
            continue

        mp = mp_by_ls.get(ls_name)
        if not mp:
            skipped += 1
            continue

        ward["mp"]         = mp["name"]
        ward["mp_phones"]  = mp["phones"]
        ward["mp_email"]   = mp["email"]
        assigned += 1

    save_json(wards_path, wards)

    # Also fix mps.json: convert assemblies from semicolon-string to proper array
    # Use canonical ward-constituency spellings so they match wards.json directly
    CORRECTED_ASSEMBLIES = {
        "Bangalore North": [
            "Yelahanka", "K.R. Puram", "Byatarayanapura", "Yeshwanthapura",
            "Dasarahalli", "Mahalakshmi Layout", "Malleshwaram", "Hebbal",
            "Ganganagar",
        ],
        "Bangalore Central": [
            "Pulakeshinagar", "Sarvagnanagar", "C.V. Raman Nagar", "Shivajinagar",
            "Gandhinagara", "Shanthinagar", "Rajajinagar", "Mahadevapura",
        ],
        "Bangalore South": [
            "Chamrajapet", "Chickpet", "Basavanagudi", "Padmanabanagar",
            "Govindrajnagar", "Vijayanagar", "Jayanagar", "BTM Layout",
            "Bommanahalli", "Rajarajeshwarinagar", "Anekal",
        ],
    }

    for mp in mps:
        correct = CORRECTED_ASSEMBLIES.get(mp["constituency"])
        if correct:
            mp["assemblies"] = correct

    save_json(mps_path, mps)

    print(f"\nResults:")
    print(f"  Wards assigned MP : {assigned}")
    print(f"  Wards skipped     : {skipped}")
    if unknown:
        print(f"  Unknown constituencies: {sorted(unknown)}")

    # Verify final state
    wards2   = load_json(wards_path)
    no_mp    = [w for w in wards2 if not w.get("mp")]
    with_mp  = [w for w in wards2 if w.get("mp")]
    print(f"\nFinal state:")
    print(f"  Wards with MP   : {len(with_mp)}")
    print(f"  Wards without MP: {len(no_mp)}")
    if no_mp:
        from collections import Counter
        counts = Counter(w.get("constituency", "") for w in no_mp)
        print("  Remaining gaps by constituency:")
        for c, n in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"    {n:3d}  {repr(c)}")


if __name__ == "__main__":
    main()
