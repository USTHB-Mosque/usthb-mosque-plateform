import React from 'react'
import Footer from './Footer'
import Navbar from './navbar/Navbar'
import { cn } from '@/lib/utils'

const Layout: React.FC<React.PropsWithChildren & { className?: string; containerClassName?: string }> = ({
  children,
  className,
  containerClassName,
}) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div
        className={cn(
          'mx-auto w-full max-w-7xl flex-1 px-6 py-8 lg:px-16',
          containerClassName,
          className,
        )}
      >
        {children}
      </div>
      <Footer />
    </div>
  )
}

export default Layout
