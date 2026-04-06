"use client"

import * as React from "react"
import Navbar from "@/components/layouts/Navbar"
import Footer from "@/components/layouts/Footer"
import CTASection from "@/components/ui/CTASection."

interface ContactUsClientProps {
  children: React.ReactNode
}

const ContactUsClient: React.FC<ContactUsClientProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      <div id="scroll-root" className="no-scrollbar w-full min-h-screen flex flex-col">
        <main className="w-full flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default ContactUsClient
