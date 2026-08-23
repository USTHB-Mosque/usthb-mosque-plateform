export function redirectToLogin() {
  const currentUrl = window.location.pathname;
  if (!currentUrl.startsWith("/auth")) {
    const loginUrl = "/auth/login?redirect=" + encodeURIComponent(currentUrl);
    window.location.replace(loginUrl);
  }
}
