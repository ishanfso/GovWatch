const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON = "YOUR_ANON_KEY_HERE";
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
