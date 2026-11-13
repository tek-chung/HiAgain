// Turns a failed sign-in into a plain explanation with the likely fix. The raw detail comes from
// the URL, so it is length-limited and shown only as text.

export type SignInReason = "provider" | "no_code" | "exchange" | "not_configured" | "profile";

export function clampDetail(detail: string | null | undefined): string | null {
  if (!detail) return null;
  const clean = detail.replace(/[\u0000-\u001f]+/g, " ").trim();
  return clean ? clean.slice(0, 200) : null;
}

export function explainSignInError(reason: string | null | undefined, detail: string | null | undefined): string {
  const d = (detail ?? "").toLowerCase();
  if (reason === "not_configured") return "Sign-in isn't configured on this deployment: the Supabase environment variables are missing.";
  if (/exchange external code|invalid_client|client authentication|client secret/.test(d)) {
    return "LinkedIn rejected the app credentials. In Supabase → Authentication → Providers → LinkedIn (OIDC), the API Key must be the LinkedIn Client ID and the API Secret Key the Client Secret.";
  }
  if (/redirect_uri|redirect uri/.test(d)) {
    return "LinkedIn doesn't recognise the return address. In the LinkedIn app's Auth tab, add the Supabase callback URL (https://<project>.supabase.co/auth/v1/callback) exactly.";
  }
  if (/email/.test(d)) {
    return "LinkedIn didn't share the details Hi Again needs. In the LinkedIn app's Products tab, add “Sign In with LinkedIn using OpenID Connect”.";
  }
  if (/unauthorized_scope|scope/.test(d)) {
    return "LinkedIn refused the requested permissions. Check that “Sign In with LinkedIn using OpenID Connect” is added under Products in the LinkedIn app.";
  }
  if (/code verifier not found|initiated in a different browser/.test(d)) {
    return "Sign-in came back in a different browser from the one it started in — this often happens after approving in the LinkedIn app. Tap Continue with LinkedIn below to sign in here; LinkedIn usually remembers your approval, so it's quick. Tip: open Hi Again directly in your phone's main browser rather than from a link inside another app.";
  }
  if (reason === "exchange" || /code verifier|flow state|flow_state|pkce/.test(d)) {
    return "Sign-in finished on a different web address from the one it started on, so the browser couldn't complete it. Open the site at one address (your main Vercel domain), make sure that address's /auth/callback is in Supabase's Redirect URLs, and try again.";
  }
  if (reason === "no_code") {
    return "The sign-in service didn't send a sign-in code back. In Supabase → Authentication → URL Configuration, add this site's /auth/callback to Redirect URLs.";
  }
  if (reason === "profile") return "You're signed in, but your profile couldn't be prepared. Check that all database migrations have been run, then try again.";
  return "Sign-in didn't complete. Please try again.";
}
