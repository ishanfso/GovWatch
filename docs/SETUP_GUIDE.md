# Setup Guide

Step-by-step instructions for setting up GovWatch. Written for non-technical users.

---

## Part 1 — See the Dashboard Right Now (No Setup Needed)

You can see the dashboard immediately without any accounts or setup:

1. Open the **GovWatch** folder on your computer
2. Go into the `dashboard` folder
3. Double-click `index.html`
4. It opens in your browser showing 20 sample civic issues from Bangalore

That's it. This uses sample (fake but realistic) data.

---

## Part 2 — Sync Changes from GitHub (Using GitHub Desktop)

Whenever I make changes to the code, you need to pull them to your laptop:

1. Open **GitHub Desktop** on your computer
2. You should see the **GovWatch** repository listed
3. Click **Fetch origin** (top right button)
4. If there are new changes, you'll see a **Pull origin** button — click it
5. Your local files are now updated

Do this whenever I tell you "changes are pushed."

---

## Part 3 — Get a Twitter API Key (Paid Basic Tier Required)

Twitter's Basic tier (paid) is required — the free tier does not support the search queries GovWatch uses. Basic tier costs $100/month and allows up to 10,000 tweets read per month.

### Step 1: Apply for Twitter Developer Access
1. Go to `https://developer.twitter.com`
2. Click **Sign up** (use your personal Twitter account, or create one)
3. Fill in the form — choose "Student" or "Hobbyist" as your use case
4. Describe the project as: *"Monitoring public civic complaints about Bangalore infrastructure to help government officials prioritize responses"*
5. Agree to the terms and submit
6. Check your email for approval

### Step 2: Upgrade to Basic Tier and Create an App
1. Once approved, go to the **Developer Portal**
2. Upgrade your plan to **Basic** (paid)
3. Click **Create Project** → give it any name (e.g., "GovWatch")
4. Choose **Read-only** access
5. After creating, you'll see a **Bearer Token** — copy it

### Step 3: Add Your Twitter Key to GovWatch
1. Open the `scripts` folder in your GovWatch directory
2. Copy the file `config.example.py` and rename the copy to `config.py`
3. Open `config.py` in Notepad (Windows) or TextEdit (Mac)
4. Replace `YOUR_TWITTER_BEARER_TOKEN_HERE` with the token you copied
5. Save the file

**Important:** Never share `config.py` with anyone or upload it anywhere. It's already in `.gitignore` so it won't be pushed to GitHub.

---

## Part 4 — Get an Anthropic API Key (For AI Filtering)

The AI filter script uses Claude to automatically remove non-civic tweets (political visits, awareness campaigns, news articles) from the data. This is optional but highly recommended for data quality.

### Step 1: Create an Anthropic Account
1. Go to `https://console.anthropic.com`
2. Click **Sign up** and create an account
3. Add a payment method (pay-as-you-go — filtering 300 tweets costs under $0.10)

### Step 2: Get Your API Key
1. In the Anthropic Console, click **API Keys** in the left sidebar
2. Click **Create Key** → give it a name like "GovWatch"
3. Copy the key (it starts with `sk-ant-...`)

### Step 3: Add Your Anthropic Key to GovWatch
1. Open `config.py` in the `scripts` folder (created in Part 3 above)
2. Replace `YOUR_ANTHROPIC_API_KEY_HERE` with the key you copied
3. Save the file

---

## Part 5 — Run the Data Fetch (Manually)

Once you have your Twitter API key set up:

### On Mac:
1. Open **Terminal** (search for it in Spotlight)
2. Type: `cd ~/GovWatch/scripts` and press Enter
3. Type: `pip install -r requirements.txt` and press Enter (first time only)
4. Type: `python fetch_tweets.py` and press Enter
5. Wait 1-2 minutes for it to finish
6. Type: `python process_issues.py` and press Enter
7. *(Optional but recommended)* Type: `python filter_issues.py` and press Enter
8. Refresh your `dashboard/index.html` in the browser — you'll see real tweets

### On Windows:
1. Open **Command Prompt** (search for it in Start Menu)
2. Type: `cd C:\Users\YourName\GovWatch\scripts` and press Enter
3. Type: `pip install -r requirements.txt` and press Enter (first time only)
4. Type: `python fetch_tweets.py` and press Enter
5. Wait 1-2 minutes
6. Type: `python process_issues.py` and press Enter
7. *(Optional but recommended)* Type: `python filter_issues.py` and press Enter
8. Refresh `dashboard/index.html` in your browser

---

## Part 6 — Host the Dashboard Online (GitHub Pages)

This makes the dashboard accessible via a URL you can share with officials.

1. Go to `https://github.com/ishanfso/GovWatch`
2. Click **Settings** (top menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select `main` branch and `/` (root) folder
5. Click **Save**
6. Wait 2-3 minutes, then visit: `https://ishanfso.github.io/GovWatch/dashboard/`

That's your live dashboard URL. Share it with government officials.

---

## Troubleshooting

**Dashboard shows no data:**
- Make sure you're opening `index.html` from the correct folder
- If you've run the fetch scripts, check that `data/issues.json` was created

**Twitter fetch gives an error:**
- Double-check that `config.py` exists in the `scripts` folder
- Make sure the Bearer Token is pasted correctly (no extra spaces)
- Confirm your Twitter developer account is on the Basic (paid) tier

**Filter script gives an error:**
- Check that `ANTHROPIC_API_KEY` is set correctly in `config.py`
- Make sure you ran `pip install -r requirements.txt`

**GitHub Desktop doesn't show updates:**
- Click the circular arrow icon to refresh
- Make sure you're on the `main` branch

**Need help?**
- Send a screenshot of the error to the project maintainer
- Or start a new Claude Code session and share the error message

---

*Last updated: 2026-05-17*
