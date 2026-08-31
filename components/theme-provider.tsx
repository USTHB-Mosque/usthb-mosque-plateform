'use client'

import { ThemeProvider as NextThemesProvider, type Attribute, type ThemeProviderProps } from 'next-themes'

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, ...props }) => {
  return (
    <NextThemesProvider attribute={'class' as Attribute} defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  )
}

export default ThemeProvider
