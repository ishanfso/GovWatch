"""
GovWatch — LLM Issue Filter
Uses Claude AI to remove non-issues from data/issues.json.

Non-issues include: political visits, awareness campaigns, news articles,
event promotions, and general discussion not about actual civic problems.

Usage:
  python filter_issues.py

Requirements:
  - config.py must contain ANTHROPIC_API_KEY
  - pip install anthropic

Reads:  data/issues.json
Writes: data/issues.json (filtered), data/issues_unfiltered.json (backup)
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

INPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/issues.json")
BACKUP_FILE = os.path.join(os.path.dirname(__file__), "../data/issues_unfiltered.json")

BATCH_SIZE = 20

SYSTEM_PROMPT = """You are a civic issue classifier for Bangalore, India.

Your task: determine if each tweet is a GENUINE CIVIC COMPLAINT reported by a citizen about public infrastructure, services, or problems in Bangalore.

GENUINE civic issues (answer "yes"):
- Potholes, road damage, flooding, waterlogging on streets
- Power cuts, electricity outages, street light failures
- Water supply problems, pipe bursts, no water
- Garbage not collected, illegal dumping, overflowing bins
- Park, lake, or public space deterioration requiring maintenance
- Traffic signal failures, road blockages causing problems
- Any citizen reporting a specific problem that BBMP, BESCOM, BWSSB, or BTP should fix

NOT genuine civic issues (answer "no"):
- News articles or media reports about government activities
- Political visits, official inaugurations, ceremonies, events
- Awareness campaigns, educational posts, crime warnings, safety tips
- Festival or exhibition promotions (mela, fair, cultural event)
- General social commentary or debate without a specific complaint
- Weather forecasts (unless reporting actual damage or flooding)
- Job postings, advertisements, promotional content
- Praise or appreciation posts (not complaints about a problem)
- News about court orders, policy decisions, statistics — not a citizen complaint

For each tweet, respond with only "yes" or "no". No explanation."""


def classify_batch(client, tweets):
    """Classify a batch of tweets. Returns list of 'yes'/'no' strings."""
    numbered = "\n\n".join(
        f"Tweet {i + 1}: {t['text']}" for i, t in enumerate(tweets)
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

    # Save backup before modifying anything
    with open(BACKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)
    print(f"Backup saved to {BACKUP_FILE}\n")

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    kept = []
    removed = []
    total_batches = (len(issues) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(issues), BATCH_SIZE):
        batch = issues[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(
            f"  Batch {batch_num}/{total_batches} ({len(batch)} tweets)...",
            end=" ",
            flush=True,
        )

        try:
            verdicts = classify_batch(client, batch)
        except Exception as e:
            print(f"ERROR — {e}. Keeping all tweets in this batch.")
            kept.extend(batch)
            continue

        batch_kept = 0
        batch_removed = 0
        for tweet, verdict in zip(batch, verdicts):
            if verdict == "yes":
                kept.append(tweet)
                batch_kept += 1
            else:
                removed.append(tweet)
                batch_removed += 1

        print(f"kept {batch_kept}, removed {batch_removed}")

        # Small pause between batches to avoid rate limits
        if batch_num < total_batches:
            time.sleep(0.5)

    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(kept, f, indent=2, ensure_ascii=False)

    print(f"\nDone!")
    print(f"  Kept:    {len(kept)} genuine civic issues")
    print(f"  Removed: {len(removed)} non-issues")
    print(f"\nDashboard will reflect filtered data on next refresh.")

    if removed:
        print(f"\nSample removed tweets:")
        for t in removed[:5]:
            print(f"  [{t.get('category', '?')}] {t['text'][:80]}...")


if __name__ == "__main__":
    filter_issues()
