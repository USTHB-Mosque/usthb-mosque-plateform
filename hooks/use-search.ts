/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SearchStorageAdapter } from '../interfaces/search.interfaces'
import { createSearchParamsAdapter } from '@/lib/adapters/search-params.adapter'
import { isValid, format, parse } from 'date-fns'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export type PrimitiveType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array'

export type FieldOverride<T> = {
  parse?: (value: string) => T
  serialize?: (value: T) => string
  type?: PrimitiveType
}

export type FieldOverrides<T extends object> = {
  [K in keyof T]?: FieldOverride<T[K]>
}

type ResetTransform<T> = (initial: T, current: T) => T

export type Reset<T> = (transform?: ResetTransform<T>) => void

export type UseSearchArgs<T extends object> = {
  initialValues: T
  fieldsConfig?: FieldOverrides<T>
  delayValue?: number
  resetMap?: Partial<Record<keyof T, (keyof T)[]>>
  storage?: SearchStorageAdapter
}

export type SetValue<T> = <K extends keyof T>(
  name: K,
  value: T[K],
  options?: { debounced?: boolean },
) => void

type SetValues<T> = (payload: Partial<T>, options?: { debounced?: boolean }) => void

const defaultParsers: Record<PrimitiveType, (v: string) => unknown> = {
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

const defaultSerializers: Record<PrimitiveType, (v: unknown) => string> = {
  string: (v) => String(v),
  number: (v) => String(v),
  boolean: (v) => ((v as boolean) ? 'true' : 'false'),
  date: (v) => (v instanceof Date && isValid(v) ? format(v, 'yyyy-MM-dd') : ''),
  enum: (v) => String(v ?? ''),
  array: (v) => (Array.isArray(v) ? v.join(',') : ''),
}

const detectType = (value: unknown): PrimitiveType => {
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  return 'enum'
}

export const useSearch = <T extends object>({
  initialValues,
  fieldsConfig,
  delayValue = 300,
  resetMap = {},
  storage = createSearchParamsAdapter(),
}: UseSearchArgs<T>) => {
  const delay = useRef(delayValue)

  const keys = useMemo(() => Object.keys(initialValues) as (keyof T)[], [initialValues])

  const parseStored = useCallback((): T => {
    const stored = storage.read()

    const parsed: Partial<T> = {}

    for (const key of keys) {
      const raw = stored[key as string]
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
  }, [initialValues, fieldsConfig, storage])

  const [values, setInternalValues] = useState<T>(() => parseStored())

  const searchValues = useDebounce(values, delay.current)

  const setValue = useCallback<SetValue<T>>(
    (name, value, { debounced = false } = {}) => {
      delay.current = debounced ? delayValue : 0

      setInternalValues((curr) => {
        const updated = { ...curr, [name]: value }

        const toReset = resetMap[name]

        if (toReset?.length) {
          for (const field of toReset) {
            updated[field] = initialValues[field] as never
          }
        }

        return updated
      })
    },
    [delayValue, resetMap, initialValues],
  )

  const setValues = useCallback<SetValues<T>>(
    (payload, { debounced = false } = {}) => {
      delay.current = debounced ? delayValue : 0

      setInternalValues((curr) => {
        const updated = { ...curr }

        for (const key in payload) {
          const value = payload[key]

          if (value === undefined) continue

          updated[key] = value

          const toReset = resetMap[key]

          if (toReset?.length) {
            for (const field of toReset) {
              updated[field] = initialValues[field]
            }
          }
        }

        return updated
      })
    },
    [delayValue, resetMap, initialValues],
  )

  const reset: Reset<T> = useCallback(
    (transform) => {
      delay.current = 0

      setInternalValues((current) => {
        if (!transform) {
          return initialValues
        }

        return transform(initialValues, current)
      })
    },
    [initialValues],
  )

  useEffect(() => {
    const serialized: Record<string, string> = {}

    for (const key of keys) {
      const val = searchValues[key]
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

      serialized[key as string] = serializer(val)
    }

    storage.write(serialized)
  }, [searchValues])

  return {
    values,
    searchValues,
    setValue,
    setValues,
    reset,
  }
}
