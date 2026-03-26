import React from 'react'
import Footer from './Footer'
import Navbar from './Navbar'

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">{children}</div>
      <Footer />
    </div>
  )
}

export default Layout
