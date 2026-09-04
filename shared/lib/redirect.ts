export function redirectToLogin() {
  const currentUrl = window.location.pathname;
  if (!currentUrl.startsWith("/auth")) {
    const loginUrl = "/auth/login?redirect=" + encodeURIComponent(currentUrl);
    window.location.replace(loginUrl);
  }
}

// Only ever follow a same-site, relative path. A `redirect` search param is
// attacker-controlled input, so `?redirect=https://evil.example` must not
// send a just-authenticated user off site.
export function safeRedirect(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
