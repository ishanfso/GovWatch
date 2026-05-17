# GovWatch Configuration Template
# Copy this file to config.py and fill in your API keys.
# NEVER commit config.py — it contains secrets and is in .gitignore.

# ── Twitter / X API ───────────────────────────────────────────────
# Get from: https://developer.twitter.com → Your App → Keys & Tokens
# Requires Basic tier (paid) — free tier does not support search queries.
TWITTER_BEARER_TOKEN = "YOUR_TWITTER_BEARER_TOKEN_HERE"

# ── Fetch Settings ────────────────────────────────────────────────
SEARCH_DAYS_BACK = 7           # How many days back to search
MAX_RESULTS_PER_QUERY = 100    # Max tweets per search query (100 = API max)
OUTPUT_FILE = "../data/issues.json"

# ── Anthropic / Claude API ────────────────────────────────────────
# Get from: https://console.anthropic.com → API Keys
# Used by filter_issues.py to remove non-civic tweets from the dataset.
ANTHROPIC_API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE"
