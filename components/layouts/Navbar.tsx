"use client"

import React, { useState, useEffect } from "react"
import { Button } from "../ui/button"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  { label: "المكتبة", href: "/library" },
  { label: "الأنشطة", href: "/activities" },
  { label: "المقالات", href: "/articles" },
  { label: "تواصل معنا", href: "/contact" },
]

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Add shadow + stronger backdrop when user scrolls
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close menu on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <header
      dir="rtl"
      className={[
        "fixed top-0 right-0 left-0 z-50 w-full transition-all duration-300",
        "backdrop-blur-md bg-white/10",
        scrolled ? "shadow-md bg-white/20" : "",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-16">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <img src="/static/images/logo.svg" alt="الشعار" className="h-10 w-auto" />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA + Hamburger */}
        <div className="flex items-center gap-3">
          <Button className="hidden md:inline-flex">سجل الآن</Button>

          {/* Mobile toggle */}
          <button
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-md p-2 text-white transition-colors hover:bg-white/10 md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={[
          "overflow-hidden transition-all duration-300 md:hidden",
          menuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <nav className="border-t border-white/10 bg-black/40 px-6 pb-6 pt-4 backdrop-blur-md">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-base font-medium text-white/90 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full">سجل الآن</Button>
        </nav>
      </div>
    </header>
  )
}

export default Navbar