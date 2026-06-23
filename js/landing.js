// On load: if already logged in, redirect to dashboard
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) window.location.replace("/dashboard/");
})();

// Also handle OAuth redirect (session in URL hash)
sb.auth.onAuthStateChange((event, session) => {
  if (session) window.location.replace("/dashboard/");
});

// City card click — show auth panel
document.querySelectorAll(".city-card.active").forEach(card => {
  card.addEventListener("click", () => {
    document.getElementById("auth-panel").classList.remove("hidden");
    document.getElementById("auth-panel").scrollIntoView({ behavior: "smooth" });
  });
});

// Google sign-in
document.getElementById("btn-google").addEventListener("click", async () => {
  await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/dashboard/" }
  });
});

// Toggle sign in / sign up
let isSignUp = false;
document.getElementById("auth-toggle").addEventListener("click", () => {
  isSignUp = !isSignUp;
  document.getElementById("name-row").classList.toggle("hidden", !isSignUp);
  document.getElementById("btn-submit").textContent = isSignUp ? "Create Account" : "Sign In";
  document.getElementById("auth-toggle-text").textContent = isSignUp ? "Already have an account?" : "Don't have an account?";
  document.getElementById("auth-toggle").textContent = isSignUp ? "Sign In" : "Sign Up";
  document.getElementById("auth-error").classList.add("hidden");
});

// Form submit
document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errEl = document.getElementById("auth-error");
  const btn = document.getElementById("btn-submit");

  btn.disabled = true;
  btn.textContent = "Please wait…";
  errEl.classList.add("hidden");

  let error;
  if (isSignUp) {
    const name = document.getElementById("full-name").value.trim();
    ({ error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } }));
    if (!error) {
      errEl.textContent = "Check your email for a confirmation link.";
      errEl.style.color = "#4ade80";
      errEl.classList.remove("hidden");
    }
  } else {
    ({ error } = await sb.auth.signInWithPassword({ email, password }));
  }

  if (error) {
    errEl.textContent = error.message;
    errEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = isSignUp ? "Create Account" : "Sign In";
  }
});
