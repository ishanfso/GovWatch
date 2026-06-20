"""
fix_department_assignments.py — Fill gaps in SWM JHI assignments using ward_no.

The ward_name key matching used when wards.json was originally built missed 38
wards whose names differed slightly from the swm_jhi.json keys. This script
falls back to matching on ward_no (exact numeric match) which is unambiguous.

No API needed. Run once from the GovWatch root:
    python scripts/fix_department_assignments.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {path}")


def fix_swm_jhi(wards, jhi_data):
    """Fill missing SWM JHI assignments using ward_no matching."""
    # Build lookup: ward_no (str) → JHI record
    jhi_by_wardno = {
        str(v["ward_no"]): v
        for v in jhi_data.values()
        if v.get("ward_no")
    }

    fixed = 0
    for ward in wards:
        if ward.get("swm_jhi"):
            continue
        wno = str(ward.get("ward_no", ""))
        jhi = jhi_by_wardno.get(wno)
        if jhi:
            ward["swm_jhi"]        = jhi.get("jhi_name", "")
            ward["swm_jhi_mobile"] = jhi.get("jhi_mobile", "")
            ward["swm_division"]   = ward.get("swm_division") or jhi.get("division", "")
            fixed += 1
            print(f"  Fixed SWM JHI: Ward {wno} {ward['ward_name']!r} → {jhi['jhi_name']!r}")

    return fixed


def fix_swm_aee(wards, aee_list):
    """Fill missing SWM AEE assignments by matching swm_division to AEE division name."""
    # aee_list is a list of {division, zone, aee_name, aee_mobile, aee_email, ...}
    aee_by_division = {}
    for aee in aee_list:
        div = aee.get("division", "").strip().upper()
        if div:
            aee_by_division[div] = aee

    fixed = 0
    for ward in wards:
        if ward.get("swm_aee"):
            continue
        div = ward.get("swm_division", "").strip().upper()
        if not div:
            continue
        aee = aee_by_division.get(div)
        if aee:
            ward["swm_aee"]         = aee.get("name", "")
            ward["swm_aee_mobile"]  = aee.get("mobile", "")
            ward["swm_aee_email"]   = aee.get("email", "")
            fixed += 1
            print(f"  Fixed SWM AEE: Ward {ward['ward_no']} {ward['ward_name']!r} → {aee['name']!r}")

    return fixed


def main():
    wards_path  = ROOT / "data/officials/wards.json"
    jhi_path    = ROOT / "data/officials/swm_jhi.json"
    aee_path    = ROOT / "data/officials/swm_aee.json"

    wards    = load_json(wards_path)
    jhi_data = load_json(jhi_path)
    aee_list = load_json(aee_path)

    before_jhi = sum(1 for w in wards if w.get("swm_jhi"))
    before_aee = sum(1 for w in wards if w.get("swm_aee"))

    print("── Fixing SWM JHI gaps ─────────────────────────")
    jhi_fixed = fix_swm_jhi(wards, jhi_data)

    print("\n── Fixing SWM AEE gaps ─────────────────────────")
    aee_fixed = fix_swm_aee(wards, aee_list)

    save_json(wards_path, wards)

    after_jhi = sum(1 for w in wards if w.get("swm_jhi"))
    after_aee = sum(1 for w in wards if w.get("swm_aee"))

    print()
    print("Results:")
    print(f"  SWM JHI: {before_jhi} → {after_jhi} wards (+{jhi_fixed} fixed)")
    print(f"  SWM AEE: {before_aee} → {after_aee} wards (+{aee_fixed} fixed)")
    still_missing_jhi = 369 - after_jhi
    if still_missing_jhi:
        print(f"  SWM JHI still missing: {still_missing_jhi} wards (no JHI record in source data)")


if __name__ == "__main__":
    main()
