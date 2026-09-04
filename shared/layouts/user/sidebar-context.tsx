'use client'

import * as React from 'react'

type UserSidebarContextValue = {
  collapsed: boolean
  toggle: () => void
}

const UserSidebarContext = React.createContext<UserSidebarContextValue | null>(null)

const STORAGE_KEY = 'member-portal:sidebar-collapsed'

export const UserSidebarProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [])

  return <UserSidebarContext.Provider value={{ collapsed, toggle }}>{children}</UserSidebarContext.Provider>
}

export function useUserSidebar(): UserSidebarContextValue {
  return React.useContext(UserSidebarContext) ?? { collapsed: false, toggle: () => {} }
}