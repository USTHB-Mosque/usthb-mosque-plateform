/**
 * A collection hook can receive a relationship either as the raw id or as the
 * populated document, depending on the depth the operation ran at. Resolving
 * both shapes in one place keeps the hooks from each re-implementing the
 * ternary, and gives the edge cases a single set of tests.
 */
export function resolveRelationId(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: number }).id
  }
  return Number.NaN
}

/**
 * The same relationship, as a document rather than an id. Admin views receive
 * relations already populated (the query asked for a `depth`), but the same
 * field reads as a bare number whenever the query did not — so a screen that
 * wants the title has to handle both, and this is where that decision lives.
 * `null` means "not populated": the caller decides what to show for it, which
 * is usually a dash rather than a crash.
 */
export function resolveDocument<T extends { id: number }>(value: unknown): T | null {
  if (value && typeof value === 'object' && 'id' in value) return value as T
  return null
}
