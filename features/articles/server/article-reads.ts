import type { Payload } from 'payload'

/**
 * Article read counters (#156) — the write half of the `article-reads` table.
 *
 * Called from the article reading page for authenticated members only. Three
 * rules make the admin analytics number mean something:
 *
 * - An anonymous reader is ignored. An unattributable row would either collapse
 *   every visitor into one counter or turn the table into an open write
 *   endpoint, so the admin screen reports *member* reads instead of pretending
 *   to be traffic.
 * - The increment is atomic. A read-modify-write through the Local API loses
 *   counts whenever two requests for the same article overlap, and the unique
 *   index would turn the loser into a thrown error, so this is one `INSERT …
 *   ON CONFLICT DO UPDATE` statement instead of a find-then-update pair.
 * - The write never breaks the page. A counter is analytics, not content: if
 *   the row cannot be written the reader still gets their article, so failures
 *   are swallowed rather than surfaced.
 *
 * `article-reads` access is closed to everyone (`collections/ArticleRead.ts`),
 * so the write bypasses it — the caller is this function, which stamps the
 * member from the session and never accepts a count from the browser. The
 * statement names the columns it writes rather than going through Payload's
 * create/update: the row must be the single writer's job, and an integration
 * test fails if the columns ever drift from `collections/ArticleRead.ts`.
 */
export async function recordArticleRead(
  payload: Payload,
  articleId: number,
  user: { id: number } | null | undefined,
): Promise<void> {
  if (!user) return

  try {
    const pool = (
      payload.db as unknown as {
        pool?: { query: (sql: string, values: unknown[]) => Promise<unknown> }
      }
    ).pool
    if (!pool) return

    await pool.query(
      `INSERT INTO article_reads (article_id, user_id, read_count, last_read_at, updated_at)
            VALUES ($1, $2, 1, now(), now())
       ON CONFLICT (article_id, user_id)
       DO UPDATE SET read_count = article_reads.read_count + 1,
                     last_read_at = now(),
                     updated_at = now()`,
      [articleId, user.id],
    )
  } catch {
    // Analytics must never cost the reader their page.
  }
}
