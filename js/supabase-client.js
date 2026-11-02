const SUPABASE_URL  = "https://efdhdzanliqghwggjrco.supabase.co";
const SUPABASE_ANON = "sb_publishable_nxxkf55J58wZsc1wvtchYQ_qGwl3r1l";
// If the Supabase library failed to load (CDN blocked, offline), `sb` stays null
// and every page falls back to its no-login behaviour instead of crashing.
let sb = null;
try {
  if (typeof supabase !== "undefined") sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
} catch (_) { sb = null; }
