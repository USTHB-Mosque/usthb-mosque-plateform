"use client"

import * as React from "react"
import Navbar from "@/components/layouts/Navbar"
import Footer from "@/components/layouts/Footer"
import CTASection from "@/components/ui/CTASection."

interface AboutUsClientProps {
  children: React.ReactNode
}

const AboutUsClient: React.FC<AboutUsClientProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      <div id="scroll-root" className="no-scrollbar w-full">
        <main className="w-full">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default AboutUsClient
