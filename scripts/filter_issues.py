"""
GovWatch -- LLM Issue Filter
Uses Claude AI to remove non-issues from data/issues.json.

Incremental: tweet IDs that were already classified are never sent to the
LLM again. Results are persisted in data/filter_verdicts.json so each run
only pays for genuinely new tweets.

Same-author near-duplicate tweets (same user spamming multiple @handles
with identical text) are removed in a pre-processing step before the LLM,
so the LLM never pays to classify them.

Usage:
  python filter_issues.py

Requirements:
  - config.py must contain ANTHROPIC_API_KEY
  - pip install anthropic

Reads:  data/issues.json
Writes: data/issues.json (filtered)
        data/issues_unfiltered.json (backup of full input)
        data/filter_verdicts.json (persistent yes/no per tweet ID)
"""

import json
import os
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

BATCH_SIZE = 20

SYSTEM_PROMPT = """You are filtering tweets to find genuine first-person citizen complaints about Bangalore civic infrastructure for a government action dashboard.

THE CORE TEST: Is a private citizen personally reporting a problem they are experiencing right now?

PASS (answer "yes"):
- Citizen reports power cut / outage in their area (any location, even vague)
- Citizen reports garbage not collected from their street or area
- Citizen reports water supply failure, pipe burst, or sewage overflow
- Citizen reports a pothole, broken road, or flooding they encountered
- Citizen reports a BESCOM billing error, wrong meter reading, or overstated bill
- Citizen reports a government portal, app, or helpline not working when they tried to use it
- Citizen reports a traffic signal failure or dangerous road condition
- Automated location-tagged reports from civic bots (e.g. NammaKasa) listing specific dump sites

FAIL (answer "no") -- reject if ANY one of these applies:
- Written by a NEWS or MEDIA account (@ANI, @NewsArenaIndia, @tv9kannada, journalism-style prose, or links to articles)
- Reports a POLITICIAN or OFFICIAL VISIT to any location (park, exhibition, inauguration) -- even at a BBMP/government space
- GOVERNMENT ANNOUNCEMENT: new scheme launch, new bus route, new service, work in progress, work completed
- AWARENESS CAMPAIGN or public safety post (phone theft awareness, BMTC safety tips, health campaigns)
- SERVICE PROMOTION: free pickup offer, new app, new scheme registration, government initiative rollout
- GENERAL CITY OPINION with no personal incident: "Bangalore is a garbage city", "roads are terrible" -- sweeping statements about the city, not about what the author personally experienced
- POLITICAL RANT: blaming a party/politician without a specific personal civic complaint attached
- REQUEST for new infrastructure: new road, new bus route, new water connection
- COMPARISON post: "Kochi / Mumbai has better X than Bangalore"
- APPRECIATION or CONGRATULATION for completed work
- AGGREGATE REPORT or civic scorecard from a monitoring organisation or NGO
- Same author, near-identical text repeated in this batch (spam to multiple handles) -- mark all but first as "no"

IMPORTANT: Different people reporting the same problem each get "yes" -- each citizen complaint is independent.

EXAMPLES:
"Ex-PM HD Devegowda visits mango exhibition at Cubbon Park" -> NO (politician visit reported by media)
"BMTC launches new Vajra Volvo AC bus to Tumakuru" -> NO (government announcement)
"Young man spreading awareness about phone theft on BMTC" -> NO (awareness campaign)
"Free bulky waste doorstep pickup now available in Bengaluru" -> NO (service promotion)
"Power cut at HSR Layout since 5 hours @NammaBESCOM" -> YES (citizen complaint)
"Garbage not collected from our street for 3 days" -> YES (vague location is fine)
"BESCOM bill doubled this month despite same usage" -> YES (billing complaint)
"No water supply in KG Halli since Friday" -> YES (citizen complaint)
"Bangalore roads are the worst in India" -> NO (general opinion, no personal incident)
"Many parts of Bengaluru roads have become HORRIBLE, roads dug up" -> NO (general opinion commentary, not a personal report)

For each tweet, respond with only "yes" or "no". No explanation."""


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


def classify_batch(client, tweets):
    """Classify a batch of tweets. Returns list of 'yes'/'no' strings."""
    numbered = "\n\n".join(
        f"Tweet {i + 1} [by {t.get('author', 'unknown')}]: {t['text']}"
        for i, t in enumerate(tweets)
    )
    user_msg = (
        f"Classify each of the following {len(tweets)} tweets as a genuine civic issue "
        f"(yes) or not (no).\n"
        f"Respond with exactly {len(tweets)} lines, each containing only 'yes' or 'no'.\n\n"
        f"{numbered}"
    )

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = response.content[0].text.strip().lower()
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip() in ("yes", "no")]

    # If response is truncated, default to keeping the tweet (safer than discarding)
    while len(lines) < len(tweets):
        lines.append("yes")

    return lines[: len(tweets)]


def filter_issues():
    if not os.path.exists(INPUT_FILE):
        print(f"ERROR: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, encoding="utf-8") as f:
        issues = json.load(f)

    print(f"Loaded {len(issues)} issues from {INPUT_FILE}")

    # Load existing verdicts from previous runs
    known_verdicts = {}
    if os.path.exists(VERDICTS_FILE):
        with open(VERDICTS_FILE, encoding="utf-8") as f:
            known_verdicts = json.load(f)
        print(f"Loaded {len(known_verdicts)} existing verdicts from {VERDICTS_FILE}")

    # Split: already classified vs needs LLM
    needs_classification = [t for t in issues if t["id"] not in known_verdicts]
    already_yes = [t for t in issues if known_verdicts.get(t["id"]) == "yes"]
    already_no_count = sum(1 for t in issues if known_verdicts.get(t["id"]) == "no")

    print(f"  Already classified: {len(already_yes)} kept + {already_no_count} previously removed")
    print(f"  New tweets to classify: {len(needs_classification)}")

    # Save backup before modifying
    with open(BACKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)
    print(f"  Backup saved to {BACKUP_FILE}\n")

    newly_kept = []
    newly_removed = []

    if needs_classification:
        # Pre-filter: auto-reject same-author near-duplicates before paying for LLM
        needs_classification, auto_dups = dedup_same_author(needs_classification, known_verdicts)
        if auto_dups:
            print(f"  Auto-rejected {len(auto_dups)} same-author duplicate tweets (no LLM cost)")
            for tweet in auto_dups:
                known_verdicts[tweet["id"]] = "no"
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
                verdicts = classify_batch(client, batch)
            except Exception as e:
                print(f"ERROR -- {e}. Keeping all tweets in this batch.")
                newly_kept.extend(batch)
                for tweet in batch:
                    known_verdicts[tweet["id"]] = "yes"
                continue

            batch_kept = 0
            batch_removed = 0
            for tweet, verdict in zip(batch, verdicts):
                known_verdicts[tweet["id"]] = verdict
                if verdict == "yes":
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
    print(f"  Auto-deduped:     {len([t for t in newly_removed if t in auto_dups]) if needs_classification else 0}")
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
