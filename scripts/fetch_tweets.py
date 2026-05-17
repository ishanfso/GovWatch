"""
GovWatch — Twitter Fetch Script
Pulls civic issue tweets from Bangalore and saves raw data.

Usage:
  python fetch_tweets.py

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

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), config.OUTPUT_FILE)


def fetch_tweets():
    client = tweepy.Client(bearer_token=config.TWITTER_BEARER_TOKEN, wait_on_rate_limit=True)

    start_time = datetime.now(timezone.utc) - timedelta(days=config.SEARCH_DAYS_BACK)
    all_tweets = []
    seen_ids = set()

    print(f"Fetching tweets from the last {config.SEARCH_DAYS_BACK} days...")

    for i, query in enumerate(SEARCH_QUERIES, 1):
        print(f"  Query {i}/{len(SEARCH_QUERIES)}: {query[:60]}...")
        try:
            response = client.search_recent_tweets(
                query=query,
                start_time=start_time,
                max_results=min(config.MAX_RESULTS_PER_QUERY, 100),
                tweet_fields=["created_at", "public_metrics", "author_id", "text"],
                expansions=["author_id"],
                user_fields=["username"],
            )

            if not response.data:
                continue

            users = {}
            if response.includes and "users" in response.includes:
                users = {u.id: u.username for u in response.includes["users"]}

            for tweet in response.data:
                if tweet.id in seen_ids:
                    continue
                seen_ids.add(tweet.id)

                metrics = tweet.public_metrics or {}
                all_tweets.append({
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

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    raw_file = OUTPUT_FILE.replace("issues.json", "raw_tweets.json")
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(all_tweets, f, indent=2, ensure_ascii=False)

    print(f"\nFetched {len(all_tweets)} unique tweets → saved to {raw_file}")
    print("Now run: python process_issues.py")


if __name__ == "__main__":
    fetch_tweets()
