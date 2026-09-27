'use client'

import * as React from 'react'

import type { BellState } from '@/features/notifications'

/**
 * The bell's initial state, fetched on the server by the member-portal layout
 * so the badge and menu render with the page instead of popping in after a
 * client-side round trip. `undefined` means no provider — the bell then falls
 * back to fetching on mount (legacy behaviour outside the member layout).
 */
const BellStateContext = React.createContext<BellState | null | undefined>(undefined)

export function BellStateProvider({
  state,
  children,
}: React.PropsWithChildren<{ state: BellState | null | undefined }>) {
  return <BellStateContext.Provider value={state}>{children}</BellStateContext.Provider>
}

export function useInitialBellState(): BellState | null | undefined {
  return React.useContext(BellStateContext)
}
