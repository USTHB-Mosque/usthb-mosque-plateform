/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SearchStorageAdapter } from '../interfaces/search.interfaces'
import { createSearchParamsAdapter } from '@/lib/adapters/search-params.adapter'
import {
  type FieldOverride,
  type FieldOverrides,
  type PrimitiveType,
  parseSearchParams,
  serializeSearchParams,
  detectType,
} from '@/lib/search-utils'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export type { FieldOverride, FieldOverrides, PrimitiveType }

type ResetTransform<T> = (initial: T, current: T) => T

export type Reset<T> = (transform?: ResetTransform<T>) => void

export type UseSearchArgs<T extends object> = {
  initialValues: T
  fieldsConfig?: FieldOverrides<T>
  delayValue?: number
  resetMap?: Partial<Record<keyof T, (keyof T)[]>>
  storage?: SearchStorageAdapter
  scope?: string
}

export type SetValue<T> = <K extends keyof T>(
  name: K,
  value: T[K],
  options?: { debounced?: boolean },
) => void

type SetValues<T> = (payload: Partial<T>, options?: { debounced?: boolean }) => void

export const useSearch = <T extends object>({
  initialValues,
  fieldsConfig,
  delayValue = 300,
  resetMap = {},
  storage = createSearchParamsAdapter(),
  scope,
}: UseSearchArgs<T>) => {
  const delay = useRef(delayValue)

  const keys = useMemo(() => Object.keys(initialValues) as (keyof T)[], [initialValues])

  const keyName = useCallback((key: keyof T): string => {
    const name = String(key)
    return scope ? `${scope}_${name}` : name
  }, [scope])

  const parseStored = useCallback((): T => {
    const stored = storage.read()
    return parseSearchParams(stored, initialValues, fieldsConfig, keyName)
  }, [initialValues, fieldsConfig, storage, keyName])

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
    const serialized = serializeSearchParams(searchValues, initialValues, fieldsConfig, keyName)
    storage.write(serialized)
  }, [searchValues, keyName])

  return {
    values,
    searchValues,
    setValue,
    setValues,
    reset,
  }
}
