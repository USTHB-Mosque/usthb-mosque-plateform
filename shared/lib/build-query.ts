import { Where } from 'payload'

type FilterValue = string | number | boolean | string[] | undefined

export function buildQuery(filters: Record<string, FilterValue>): Where {
  const andFilters: Where[] = []

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue

    // `value === ''` is dropped above, so string needs no extra guard here.
    // Whatever survives the branches above is a number or boolean scalar.
    if (Array.isArray(value)) {
      andFilters.push({ [key]: { in: value } })
    } else if (typeof value === 'string') {
      andFilters.push({ [key]: { contains: value } })
    } else {
      andFilters.push({ [key]: { equals: value } })
    }
  }

  return andFilters.length > 0 ? { and: andFilters } : {}
}
