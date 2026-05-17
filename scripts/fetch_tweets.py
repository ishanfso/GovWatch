"""
GovWatch — Twitter Fetch Script
Pulls civic issue tweets from Bangalore and saves raw data.

Usage:
  python fetch_tweets.py

Incremental: already-fetched tweet IDs are skipped automatically.
Run as many times as needed to grow the dataset.

Requirements:
  - Copy config.example.py to config.py and add your Bearer Token
  - pip install -r requirements.txt
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

try:
    import tweepy
except ImportError:
    print("ERROR: tweepy not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    import config
except ImportError:
    print("ERROR: config.py not found.")
    print("Copy config.example.py to config.py and add your Twitter Bearer Token.")
    sys.exit(1)

# Search queries targeting Bangalore civic issues
SEARCH_QUERIES = [
    # Roads
    '("bangalore" OR "bengaluru") (pothole OR "road damage" OR "road condition") lang:en -is:retweet',
    '(#BangaloreRoads OR #BBMPRoads) -is:retweet',

    # Water
    '("bangalore" OR "bengaluru") (BWSSB OR "water supply" OR "water cut" OR "no water") lang:en -is:retweet',

    # Electricity
    '("bangalore" OR "bengaluru") (BESCOM OR "power cut" OR "power outage" OR "no electricity") lang:en -is:retweet',

    # Waste
    '("bangalore" OR "bengaluru") (garbage OR "solid waste" OR "SWM" OR "dumping") lang:en -is:retweet',

    # Flooding
    '("bangalore" OR "bengaluru") (waterlogged OR flooding OR "storm drain" OR "rain water") lang:en -is:retweet',

    # Parks
    '("bangalore" OR "bengaluru") (BBMP park OR "garden maintenance" OR Lalbagh OR Cubbon) lang:en -is:retweet',

    # Traffic
    '("bangalore" OR "bengaluru") ("traffic signal" OR "traffic jam" OR BMTC OR "road block") lang:en -is:retweet',

    # Direct complaints
    '@BBMP_MAYOR (complaint OR issue OR problem OR broken OR damaged) lang:en -is:retweet',
]

RAW_FILE = os.path.join(os.path.dirname(__file__), "../data/raw_tweets.json")


def fetch_tweets():
    # Load already-fetched tweets to get the highest ID and avoid re-paying for old ones
    existing_tweets = []
    seen_ids = set()
    since_id = None
    if os.path.exists(RAW_FILE):
        with open(RAW_FILE, encoding="utf-8") as f:
            existing_tweets = json.load(f)
        seen_ids = {t["id"] for t in existing_tweets}
        since_id = max(int(t["id"]) for t in existing_tweets)
        print(f"Loaded {len(existing_tweets)} existing tweets.")
        print(f"Using since_id={since_id} — Twitter will only return tweets newer than this.")
    else:
        print(f"No existing data — fetching last {config.SEARCH_DAYS_BACK} days.")

    client = tweepy.Client(bearer_token=config.TWITTER_BEARER_TOKEN, wait_on_rate_limit=True)
    # start_time is only used on the very first run (when there is no since_id)
    start_time = datetime.now(timezone.utc) - timedelta(days=config.SEARCH_DAYS_BACK)
    new_tweets = []

    print(f"Fetching new tweets...")

    for i, query in enumerate(SEARCH_QUERIES, 1):
        print(f"  Query {i}/{len(SEARCH_QUERIES)}: {query[:60]}...")
        try:
            kwargs = dict(
                query=query,
                max_results=min(config.MAX_RESULTS_PER_QUERY, 100),
                tweet_fields=["created_at", "public_metrics", "author_id", "text"],
                expansions=["author_id"],
                user_fields=["username"],
            )
            if since_id:
                kwargs["since_id"] = since_id   # server-side: only newer tweets returned
            else:
                kwargs["start_time"] = start_time  # first run: use time window instead

            response = client.search_recent_tweets(**kwargs)

            if not response.data:
                continue

            users = {}
            if response.includes and "users" in response.includes:
                users = {u.id: u.username for u in response.includes["users"]}

            for tweet in response.data:
                if str(tweet.id) in seen_ids:
                    continue
                seen_ids.add(str(tweet.id))

                metrics = tweet.public_metrics or {}
                new_tweets.append({
                    "id": str(tweet.id),
                    "text": tweet.text,
                    "author": f"@{users.get(tweet.author_id, 'unknown')}",
                    "date": tweet.created_at.isoformat() if tweet.created_at else None,
                    "likes": metrics.get("like_count", 0),
                    "retweets": metrics.get("retweet_count", 0),
                    "source_url": f"https://twitter.com/i/web/status/{tweet.id}",
                    "_raw_query_index": i - 1,
                })

        except tweepy.TweepyException as e:
            print(f"    Warning: query {i} failed — {e}")
            continue

    all_tweets = existing_tweets + new_tweets

    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    with open(RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(all_tweets, f, indent=2, ensure_ascii=False)

    print(f"\nFetched {len(new_tweets)} new tweets (Twitter only returned tweets newer than last fetch)")
    print(f"Total in raw_tweets.json: {len(all_tweets)}")
    print("Now run: python process_issues.py")


if __name__ == "__main__":
    fetch_tweets()
