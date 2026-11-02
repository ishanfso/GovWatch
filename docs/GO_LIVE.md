# Go-Live Checklist

What it takes to bring Civic Issue India back to fully live, in plain English.
Last reviewed: 2026-11-02.

---

## Where things stand

| Piece | Status | What's wrong |
|---|---|---|
| Website hosting (GitHub Pages) | ✅ Working | Deploys succeed after every push |
| Public landing page + demo dashboard | ✅ Working | Opens without login, so a CV link always works |
| Twitter/X data feed | ❌ Stopped | Every query returns **"402 Payment Required — credits depleted"**. Newest complaint is from 4 Jul 2026 |
| Supabase (login, shared status, notes) | ❌ Deleted | The project's address no longer exists (checked 2026-11-02). Sign-in is switched off until a new project is set up |
| Domain `civicissue.in` | ❓ Check | Make sure the domain registration hasn't expired |

---

## Step 1 — Check the domain (5 minutes, free)

1. Open `https://civicissue.in` in a browser.
2. If it doesn't load, log in to wherever you bought the domain and check it's renewed.
3. In GitHub → repo **Settings → Pages**, confirm the custom domain says `civicissue.in` with a green tick and **Enforce HTTPS** is on.

## Step 2 — Set up a new Supabase project (about 30 minutes, free) — optional

Only needed if you want official logins, shared status and team notes back. The public demo works without it.

The old project (`efdhdzanliqghwggjrco`) has been deleted, so it can't be restored. Create a new one at supabase.com, then:
   - open **SQL Editor** and run everything in `scripts/supabase_schema.sql`
   - copy the new **Project URL** and **publishable (anon) key** into `js/supabase-client.js`
   - under **Authentication → URL Configuration**, add `https://civicissue.in/dashboard/` as a redirect URL
   - re-enable the Google sign-in provider
   - ask Claude to switch sign-in back on (`AUTH_ENABLED = true` in `js/supabase-client.js`)
   - sign in once, then make yourself admin in the `profiles` table (`role = admin`)
4. Note: free projects pause again after a quiet week. Logging in once a week or so keeps it awake; the paid tier never pauses.

> Even if Supabase stays down, the site still works: visitors get the read-only public demo.

## Step 3 — Restart the Twitter/X data feed (costs money)

1. Log in to the X developer console and open your app's billing/usage page.
2. Top up credits or re-activate a paid plan. Check current pricing there; it has changed several times.
3. If you made a new app or key, update the `TWITTER_BEARER_TOKEN` secret in GitHub → **Settings → Secrets and variables → Actions**.
4. Check the `ANTHROPIC_API_KEY` secret still works (it pays for the AI filter, a few cents per run).
5. In GitHub → **Actions → Auto-refresh Civic Issues Data**, click **Run workflow** to test it.

**Cost guard:** the refresh used to run every 5 minutes, which uses up credits fast. It now runs **once a day** (about 6 AM IST), and the run fails with a clear error if every query is refused, so GitHub emails you instead of failing silently.

## Step 4 — Share it

- CV / LinkedIn link: `https://civicissue.in` — no login needed.
- The landing page says honestly when data collection is paused ("archive to 4 Jul 2026").
  Once the feed is back, it switches to "live" automatically.
