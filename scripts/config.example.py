# GovWatch Configuration Template
#
# Instructions:
# 1. Copy this file: rename the copy to "config.py" (in the same folder)
# 2. Fill in your Twitter API Bearer Token below
# 3. NEVER share config.py or push it to GitHub (it's already in .gitignore)

# Twitter API v2 — Bearer Token
# Get yours free at: https://developer.twitter.com
TWITTER_BEARER_TOKEN = "YOUR_BEARER_TOKEN_HERE"

# Search settings
SEARCH_DAYS_BACK = 7          # How many days back to search (max 7 for free tier)
MAX_RESULTS_PER_QUERY = 100   # Tweets per search query (max 100 for free tier)

# Output
OUTPUT_FILE = "../data/issues.json"
SAMPLE_FILE = "../data/sample_issues.json"

# Bangalore bounding box (for geo-filtering)
BANGALORE_BBOX = "77.4601,12.8340,77.7816,13.1439"  # SW_lon,SW_lat,NE_lon,NE_lat
