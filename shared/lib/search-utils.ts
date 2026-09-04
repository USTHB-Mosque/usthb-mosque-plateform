import { isValid, format, parse } from 'date-fns'

export type PrimitiveType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array'

export const defaultParsers: Record<PrimitiveType, (v: string) => unknown> = {
  string: (v) => v,

  number: (v) => {
    const n = Number(v)
    return isNaN(n) ? undefined : n
  },

  boolean: (v) => v === 'true' || v === '1',

  date: (v) => {
    const d = parse(v, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : undefined
  },

  enum: (v) => v,

  array: (v) => v.split(','),
}

export const defaultSerializers: Record<PrimitiveType, (v: unknown) => string> = {
  string: (v) => String(v),
  number: (v) => String(v),
  boolean: (v) => ((v as boolean) ? 'true' : 'false'),
  date: (v) => (v instanceof Date && isValid(v) ? format(v, 'yyyy-MM-dd') : ''),
  enum: (v) => String(v ?? ''),
  array: (v) => (Array.isArray(v) ? v.join(',') : ''),
}

export function detectType(value: unknown): PrimitiveType {
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  return 'enum'
}

export interface FieldOverride<T> {
  parse?: (value: string) => T
  serialize?: (value: T) => string
  type?: PrimitiveType
}

export type FieldOverrides<T extends object> = {
  [K in keyof T]?: FieldOverride<T[K]>
}

export function parseSearchParams<T extends object>(
  stored: Record<string, string>,
  initialValues: T,
  fieldsConfig?: FieldOverrides<T>,
  keyNameFn?: (key: keyof T) => string,
): T {
  const parsed: Partial<T> = {}

  for (const key of Object.keys(initialValues) as (keyof T)[]) {
    const raw = keyNameFn ? stored[keyNameFn(key)] : stored[String(key)]
    const defaultValue = initialValues[key]

    if (!raw) {
      parsed[key] = defaultValue
      continue
    }

    const cfg = fieldsConfig?.[key]
    const type = cfg?.type ?? detectType(defaultValue)
    const parser = cfg?.parse ?? defaultParsers[type]
    const parsedValue = parser(raw)

    parsed[key] = parsedValue !== undefined ? (parsedValue as T[keyof T]) : defaultValue
  }

  return { ...initialValues, ...parsed }
}

export function serializeSearchParams<T extends object>(
  values: T,
  initialValues: T,
  fieldsConfig?: FieldOverrides<T>,
  keyNameFn?: (key: keyof T) => string,
): Record<string, string> {
  const serialized: Record<string, string> = {}
  const keys = Object.keys(initialValues) as (keyof T)[]

  for (const key of keys) {
    const val = values[key]
    const defaultValue = initialValues[key]

    if (
      val === undefined ||
      val === null ||
      val === '' ||
      JSON.stringify(val) === JSON.stringify(defaultValue)
    ) {
      continue
    }

    const cfg = fieldsConfig?.[key]
    const type = cfg?.type ?? detectType(val)
    const serializer = cfg?.serialize ?? defaultSerializers[type]

    serialized[keyNameFn ? keyNameFn(key) : String(key)] = serializer(val)
  }

  return serialized
}
