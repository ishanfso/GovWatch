# GovWatch Configuration Template
# Copy this file to config.py and fill in your API keys.
# NEVER commit config.py — it contains secrets and is in .gitignore.

# ── Twitter / X API ───────────────────────────────────────────────
# Get from: https://developer.twitter.com → Your App → Keys & Tokens
# Requires Basic tier (paid) — free tier does not support search queries.
TWITTER_BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAAM%2Br9gEAAAAAwumzKFA4QMTUuSUClEogAy1vjGA%3DeVs3VRndUEa3GcX7Amk69npCIiEQD6vZuQEut8DDYMd7BOEmCa"

# ── Fetch Settings ────────────────────────────────────────────────
SEARCH_DAYS_BACK = 7           # How many days back to search
MAX_RESULTS_PER_QUERY = 100    # Max tweets per search query (100 = API max)
OUTPUT_FILE = "../data/issues.json"
SAMPLE_FILE = "../data/sample_issues.json"

# ── Anthropic / Claude API ────────────────────────────────────────
# Get from: https://console.anthropic.com → API Keys
# Used by filter_issues.py to remove non-civic tweets from the dataset.
ANTHROPIC_API_KEY = "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"


# Bangalore bounding box (for geo-filtering)
BANGALORE_BBOX = "77.4601,12.8340,77.7816,13.1439"  # SW_lon,SW_lat,NE_lon,NE_lat
