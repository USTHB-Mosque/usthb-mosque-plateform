/**
 * Connection string for the Payload Postgres pool.
 *
 * `DATABASE_URL` is always host-facing, so host-run dev, tests and seeds use
 * loopback. Compose containers set `COMPOSE_DB_HOST=db`; rewriting only the host
 * and port (instead of interpolating a URL from the raw password) keeps
 * percent-encoded credentials intact — a password containing `#`, `/` or `@`
 * stays valid.
 */
export function resolveDatabaseConnectionString(
  databaseUrl: string | undefined,
  composeHost: string | undefined,
  port: string = '5432',
): string {
  const url = databaseUrl || ''
  if (!composeHost || !url) return url

  try {
    const parsed = new URL(url)
    parsed.hostname = composeHost
    parsed.port = port
    return parsed.toString()
  } catch {
    // An unparseable URL is reported by the pool on connect, not at import.
    return url
  }
}
