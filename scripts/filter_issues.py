"""
GovWatch -- LLM Issue Filter + Area Extractor
Uses Claude AI to remove non-issues and simultaneously extract the specific
Bangalore locality from the tweet text.

Incremental: tweet IDs that were already classified are never sent to the
LLM again. Results are persisted in data/filter_verdicts.json so each run
only pays for genuinely new tweets.

Same-author near-duplicate tweets (same user spamming multiple @handles
with identical text) are removed in a pre-processing step before the LLM,
so the LLM never pays to classify them.

Verdict format (new): {"verdict": "yes"/"no", "area": "locality or null"}
Verdict format (old, backward-compat): "yes" / "no" string

Usage:
  python filter_issues.py

Requirements:
  - config.py must contain ANTHROPIC_API_KEY
  - pip install anthropic

Reads:  data/issues.json
Writes: data/issues.json (filtered, with area/ward enriched for new tweets)
        data/issues_unfiltered.json (backup of full input)
        data/filter_verdicts.json (persistent verdict+area per tweet ID)
"""

import json
import os
import re
import sys
import time

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

try:
    import config
except ImportError:
    print("ERROR: config.py not found.")
    print("Copy config.example.py to config.py and add your Anthropic API key.")
    sys.exit(1)

if not hasattr(config, "ANTHROPIC_API_KEY") or not config.ANTHROPIC_API_KEY:
    print("ERROR: ANTHROPIC_API_KEY not set in config.py")
    sys.exit(1)

INPUT_FILE    = os.path.join(os.path.dirname(__file__), "../data/issues.json")
BACKUP_FILE   = os.path.join(os.path.dirname(__file__), "../data/issues_unfiltered.json")
VERDICTS_FILE = os.path.join(os.path.dirname(__file__), "../data/filter_verdicts.json")
WARDS_FILE    = os.path.join(os.path.dirname(__file__), "../data/officials/wards.json")

BATCH_SIZE = 10  # Smaller batch for JSON responses (more tokens per tweet)

# ---------------------------------------------------------------------------
# Geographically verified area -> canonical ward name mapping.
# Keys are lowercase; values are exact ward_name strings from wards.json.
# Do NOT use area_ward_lookup.json -- it contains wrong entries.
# Kept in sync with AREA_TO_WARD in process_issues.py.
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
    # Convenience aliases
    "old airport road":  "Indiranagar",
    "airport road":      "Indiranagar",
    "cunningham road":   "Shivajinagar",
    "residency road":    "Shivajinagar",
}

SYSTEM_PROMPT = """You are analyzing tweets about Bangalore civic issues for a government action dashboard.

For each tweet, you must do TWO things:
1. Decide if it is a genuine first-person citizen complaint about civic infrastructure
2. Extract the specific Bangalore locality mentioned (if any)

THE CORE TEST: Is a private citizen personally reporting a problem they are experiencing right now?

PASS (verdict: "yes"):
- Citizen reports power cut / outage in their area (any location, even vague)
- Citizen reports garbage not collected from their street or area
- Citizen reports water supply failure, pipe burst, or sewage overflow
- Citizen reports a pothole, broken road, or flooding they encountered
- Citizen reports a BESCOM billing error, wrong meter reading, or overstated bill
- Citizen reports a government portal, app, or helpline not working when they tried to use it
- Citizen reports a traffic signal failure or dangerous road condition
- Automated location-tagged reports from civic bots (e.g. NammaKasa) listing specific dump sites

FAIL (verdict: "no") -- reject if ANY one of these applies:
- Written by a NEWS or MEDIA account (@ANI, @NewsArenaIndia, @tv9kannada, journalism-style prose, or links to articles)
- Reports a POLITICIAN or OFFICIAL VISIT to any location (park, exhibition, inauguration) -- even at a BBMP/government space
- GOVERNMENT ANNOUNCEMENT: new scheme launch, new bus route, new service, work in progress, work completed
- AWARENESS CAMPAIGN or public safety post (phone theft awareness, BMTC safety tips, health campaigns)
- SERVICE PROMOTION: free pickup offer, new app, new scheme registration, government initiative rollout
- GENERAL CITY OPINION with no personal incident: sweeping statements about the city, not about what the author personally experienced
- POLITICAL RANT: blaming a party/politician without a specific personal civic complaint attached
- REQUEST for new infrastructure: new road, new bus route, new water connection
- COMPARISON post: "Kochi / Mumbai has better X than Bangalore"
- APPRECIATION or CONGRATULATION for completed work
- Same author, near-identical text repeated in this batch (spam to multiple handles) -- mark all but first as "no"

AREA EXTRACTION RULES:
- Return the most specific Bangalore locality (neighbourhood, layout, road name, area name)
- Examples: "K.Channasandra", "Koramangala 5th Block", "HSR Layout Sector 1", "Bannerghatta Road"
- Strip "Bangalore"/"Bengaluru" from the result (e.g. return "Whitefield", not "Whitefield, Bangalore")
- If only a broad city mention with no specific area: return null
- Even for "no" verdicts, extract the area if present

IMPORTANT: Different people reporting the same problem each get "yes" -- each citizen complaint is independent.

RESPONSE FORMAT: Return a JSON array with exactly one object per tweet, in order:
[
  {"verdict": "yes", "area": "Koramangala"},
  {"verdict": "no", "area": null},
  {"verdict": "yes", "area": "K.Channasandra"}
]

Return ONLY the JSON array. No explanation, no markdown."""


def jaccard_similarity(text1, text2):
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    if not words1 or not words2:
        return 0.0
    return len(words1 & words2) / len(words1 | words2)


def dedup_same_author(tweets, known_verdicts):
    """
    For each author, if they have multiple near-identical tweets (Jaccard >= 0.75),
    auto-reject duplicates so the LLM never classifies them.
    Returns (unique_tweets, auto_rejected_tweets).
    """
    by_author = {}
    for t in tweets:
        author = t.get("author", "")
        by_author.setdefault(author, []).append(t)

    unique, auto_rejected = [], []
    for author_tweets in by_author.values():
        kept = []
        for tweet in author_tweets:
            is_dup = any(jaccard_similarity(tweet["text"], k["text"]) >= 0.75 for k in kept)
            if is_dup:
                auto_rejected.append(tweet)
            else:
                kept.append(tweet)
        unique.extend(kept)

    return unique, auto_rejected


def get_verdict_str(v):
    """Normalize a verdict entry to 'yes'/'no' string (handles old string format and new dict)."""
    if v is None:
        return None
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        return v.get("verdict", "yes")
    return None


def get_area_from_verdict(v):
    """Extract area from a verdict entry (new dict format only)."""
    if isinstance(v, dict):
        return v.get("area") or None
    return None


def trigram_sim(a, b):
    """Jaccard similarity on character trigrams."""
    def tg(s):
        s = s.lower()
        return {s[i:i+3] for i in range(len(s) - 2)} if len(s) >= 3 else {s}
    ta, tb = tg(a), tg(b)
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0


def load_wards():
    """Load all 369 wards from wards.json."""
    try:
        with open(WARDS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


WARDS = load_wards()


def match_ward(area, wards):
    """
    Match an extracted area string to a ward object.
    Uses AREA_TO_WARD (geographically verified) then trigram fallback.
    Returns the ward dict or None.
    """
    if not area or area.lower() in ("bangalore", "bengaluru", ""):
        return None

    lc = area.lower().strip()

    # Pass 1 -- curated mapping
    ward_name = AREA_TO_WARD.get(lc)
    if ward_name:
        for w in wards:
            if w.get("ward_name") == ward_name:
                return w

    # Pass 2 -- trigram similarity against all 369 ward names (threshold 0.35)
    best, best_score = None, 0.35
    for w in wards:
        score = trigram_sim(lc, w.get("ward_name", "").lower())
        if score > best_score:
            best_score = score
            best = w
    return best


def classify_batch(client, tweets):
    """Classify a batch of tweets. Returns list of dicts: {"verdict": str, "area": str|None}."""
    numbered = "\n\n".join(
        f"Tweet {i + 1} [by {t.get('author', 'unknown')}]: {t['text']}"
        for i, t in enumerate(tweets)
    )
    user_msg = (
        f"Analyze the following {len(tweets)} tweets.\n"
        f"Return a JSON array with exactly {len(tweets)} objects in the same order.\n\n"
        f"{numbered}"
    )

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = response.content[0].text.strip()

    # Parse JSON array response
    try:
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        results = json.loads(raw)
        if not isinstance(results, list):
            raise ValueError("Not a list")
    except Exception:
        # Fallback: try to extract individual JSON objects
        results = []
        for m in re.finditer(r'\{[^{}]+\}', raw):
            try:
                results.append(json.loads(m.group()))
            except Exception:
                pass

    # Normalize results and pad if truncated
    output = []
    for item in results[:len(tweets)]:
        if isinstance(item, dict):
            verdict = item.get("verdict", "yes").lower().strip()
            if verdict not in ("yes", "no"):
                verdict = "yes"
            area = item.get("area") or None
            if area and area.lower() in ("bangalore", "bengaluru", "null", "none", ""):
                area = None
        else:
            verdict, area = "yes", None
        output.append({"verdict": verdict, "area": area})

    # If response truncated, default to keeping (safer than discarding)
    while len(output) < len(tweets):
        output.append({"verdict": "yes", "area": None})

    return output[:len(tweets)]


def filter_issues():
    if not os.path.exists(INPUT_FILE):
        print(f"ERROR: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, encoding="utf-8") as f:
        issues = json.load(f)

    print(f"Loaded {len(issues)} issues from {INPUT_FILE}")

    # Load ward data for area -> ward matching
    print(f"  Ward data: {len(WARDS)} wards loaded")

    # Load existing verdicts from previous runs
    known_verdicts = {}
    if os.path.exists(VERDICTS_FILE):
        with open(VERDICTS_FILE, encoding="utf-8") as f:
            known_verdicts = json.load(f)
        print(f"Loaded {len(known_verdicts)} existing verdicts from {VERDICTS_FILE}")

    # Split: already classified vs needs LLM
    needs_classification = [t for t in issues if t["id"] not in known_verdicts]
    already_yes = [t for t in issues if get_verdict_str(known_verdicts.get(t["id"])) == "yes"]
    already_no_count = sum(1 for t in issues if get_verdict_str(known_verdicts.get(t["id"])) == "no")

    print(f"  Already classified: {len(already_yes)} kept + {already_no_count} previously removed")
    print(f"  New tweets to classify: {len(needs_classification)}")

    # Save backup before modifying
    with open(BACKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)
    print(f"  Backup saved to {BACKUP_FILE}\n")

    newly_kept = []
    newly_removed = []
    auto_dups = []

    if needs_classification:
        # Pre-filter: auto-reject same-author near-duplicates before paying for LLM
        needs_classification, auto_dups = dedup_same_author(needs_classification, known_verdicts)
        if auto_dups:
            print(f"  Auto-rejected {len(auto_dups)} same-author duplicate tweets (no LLM cost)")
            for tweet in auto_dups:
                known_verdicts[tweet["id"]] = {"verdict": "no", "area": None}
                newly_removed.append(tweet)

        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        total_batches = (len(needs_classification) + BATCH_SIZE - 1) // BATCH_SIZE

        for i in range(0, len(needs_classification), BATCH_SIZE):
            batch = needs_classification[i : i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            print(
                f"  Batch {batch_num}/{total_batches} ({len(batch)} tweets)...",
                end=" ",
                flush=True,
            )

            try:
                results = classify_batch(client, batch)
            except Exception as e:
                print(f"ERROR -- {e}. Keeping all tweets in this batch.")
                newly_kept.extend(batch)
                for tweet in batch:
                    known_verdicts[tweet["id"]] = {"verdict": "yes", "area": None}
                continue

            batch_kept = 0
            batch_removed = 0
            for tweet, result in zip(batch, results):
                verdict = result["verdict"]
                area = result["area"]

                known_verdicts[tweet["id"]] = {"verdict": verdict, "area": area}

                if verdict == "yes":
                    # Enrich with area + ward if LLM found a location
                    if area:
                        tweet["area"] = area
                        ward = match_ward(area, WARDS)
                        if ward:
                            tweet["ward_name"] = ward.get("ward_name", "")
                            tweet["ward_no"] = ward.get("ward_no", "")
                    newly_kept.append(tweet)
                    batch_kept += 1
                else:
                    newly_removed.append(tweet)
                    batch_removed += 1

            print(f"kept {batch_kept}, removed {batch_removed}")

            if batch_num < total_batches:
                time.sleep(0.5)
    else:
        print("  No new tweets to classify -- all already processed.")

    # Back-fill area/ward from verdicts dict for already-yes tweets that have area stored
    enriched_existing = 0
    for tweet in already_yes:
        v = known_verdicts.get(tweet["id"])
        area = get_area_from_verdict(v)
        if area and (not tweet.get("area") or tweet.get("area") == "Bangalore"):
            tweet["area"] = area
            ward = match_ward(area, WARDS)
            if ward:
                tweet["ward_name"] = ward.get("ward_name", "")
                tweet["ward_no"] = ward.get("ward_no", "")
                enriched_existing += 1

    if enriched_existing:
        print(f"  Back-filled area/ward for {enriched_existing} previously-kept tweets")

    # Persist updated verdicts
    with open(VERDICTS_FILE, "w", encoding="utf-8") as f:
        json.dump(known_verdicts, f, indent=2, ensure_ascii=False)

    # Build final output: previously kept + newly kept
    kept = already_yes + newly_kept
    severity_order = {"high": 0, "medium": 1, "low": 2}
    kept.sort(key=lambda x: (severity_order.get(x["severity"], 3), -(x["likes"] + x["retweets"])))

    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(kept, f, indent=2, ensure_ascii=False)

    print(f"\nDone!")
    print(f"  Previously kept:  {len(already_yes)}")
    print(f"  Auto-deduped:     {len(auto_dups)}")
    print(f"  Newly kept:       {len(newly_kept)}")
    print(f"  Total in feed:    {len(kept)}")
    print(f"  Removed this run: {len(newly_removed)}")
    print(f"\nDashboard will reflect filtered data on next refresh.")

    if newly_removed:
        print(f"\nSample removed this run:")
        for t in newly_removed[:5]:
            print(f"  [{t.get('category', '?')}] {t['text'][:80]}...")


if __name__ == "__main__":
    filter_issues()
