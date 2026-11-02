const SUPABASE_URL  = "https://efdhdzanliqghwggjrco.supabase.co";
const SUPABASE_ANON = "sb_publishable_nxxkf55J58wZsc1wvtchYQ_qGwl3r1l";
// Master switch for sign-in. The original Supabase project above was deleted
// (its address no longer exists), so sign-in is OFF until a new project is
// created. To turn it back on: paste the new URL + key above and set this to true.
// See docs/GO_LIVE.md, Step 2.
const AUTH_ENABLED = false;

// If sign-in is off, or the Supabase library failed to load, `sb` stays null
// and every page runs as the read-only public demo instead of crashing.
let sb = null;
try {
  if (AUTH_ENABLED && typeof supabase !== "undefined") sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
} catch (_) { sb = null; }
