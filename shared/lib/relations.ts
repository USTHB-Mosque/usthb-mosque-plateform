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
