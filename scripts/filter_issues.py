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

SYSTEM_PROMPT = """You are a civic issue classifier for Bangalore, India.

Your task: determine if each tweet represents a GENUINE CIVIC ISSUE experienced by a citizen -- a real problem with public infrastructure or government services that warrants tracking and follow-up.

ANSWER "yes" -- genuine civic issues worth tracking:
- Power cuts or electricity outages reported by a citizen (location may be vague -- that is okay)
- Garbage not collected, illegal dumping, overflowing bins
- Water supply failures, pipe bursts, sewage overflow
- Potholes, road damage, broken footpaths
- Waterlogging or flooding on streets
- Traffic signal failures or dangerous road conditions
- BESCOM billing disputes, overstated bills, wrong meter readings
- Government service failures: portals not working, complaint apps broken, helplines unreachable
- Any citizen reporting a real problem they personally experienced with a government body
- Automated civic reports (e.g. NammaKasa bot) with specific dump locations

NOTE: A tweet does NOT need a specific street address to be marked "yes".
Even a vague location ("somewhere in Bangalore") is acceptable -- we can follow up
for more detail. What matters is whether a real citizen experienced a real problem.

ANSWER "no" -- NOT a genuine civic issue:
- General political commentary: blaming politicians, party politics, "government is useless"
- City-level opinion with no personal experience: sweeping statements like "Bangalore is a garbage city" not tied to a specific incident the author witnessed
- News articles or media reports (not a first-person citizen complaint)
- Government progress updates: work already in progress at a location -- not a complaint
- Requests for new infrastructure: new bus routes, new pipelines, new roads -- suggestions, not complaints
- Comparison posts: "Kochi has better footpaths" with no actual complaint about Bangalore
- Appreciation or thanks for completed work
- Aggregate civic scorecards or accountability threads from third-party organisations
- Purely satirical posts with no underlying real complaint
- A tweet that is word-for-word (or near word-for-word) identical to another tweet in THIS BATCH from the SAME author -- the author is spamming multiple @handles with the same text; mark the duplicate "no", keep only the first occurrence

IMPORTANT: If DIFFERENT users report the same type of problem (e.g. multiple people complaining about power cuts in their respective areas), mark ALL of them "yes" -- each citizen's complaint is independent and deserves acknowledgment.

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
