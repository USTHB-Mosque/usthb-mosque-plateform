import React from 'react'
import Footer from './Footer'
import Navbar from './Navbar'
import { cn } from '@/lib/utils'

const Layout: React.FC<React.PropsWithChildren & { className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div>
      <Navbar />
      <div className={cn('container mx-auto py-8', className)}>{children}</div>
      <Footer />
    </div>
  )
}

export default Layout
