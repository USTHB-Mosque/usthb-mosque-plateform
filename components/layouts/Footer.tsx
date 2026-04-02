import Link from 'next/link'
import Image from 'next/image'
import React from 'react'
import { FaTiktok, FaLinkedin } from "react-icons/fa"
import { SiLinktree } from "react-icons/si"
import { FaFacebookF } from "react-icons/fa6"
import { PiInstagramLogoBold } from "react-icons/pi"

const SOCIAL_LINKS = [
  { href: "#", icon: <FaFacebookF />, label: "Facebook" },
  { href: "#", icon: <FaLinkedin />, label: "LinkedIn" },
  { href: "#", icon: <FaTiktok />, label: "TikTok" },
  { href: "#", icon: <PiInstagramLogoBold size={20} />, label: "Instagram" },
  { href: "#", icon: <SiLinktree />, label: "Linktree" },
]

const Footer: React.FC = () => {
  return (
    <footer className="
      bg-[#E8F2F8]
      flex flex-col items-center gap-4 px-6 py-6
      md:flex-row md:justify-between md:px-16 md:py-5
    ">

      {/* Logo — top on mobile, center on desktop */}
      <div className="flex justify-center md:order-2 md:flex-1">
        <Image
          src="/static/images/logo_minimalist.svg"
          alt="Logo"
          width={20}
          height={30}
        />
      </div>

      {/* Social icons — below logo on mobile, left on desktop */}
      <ul className="flex items-center gap-4 md:order-1 md:flex-1">
        {SOCIAL_LINKS.map(({ href, icon, label }) => (
          <li key={label}>
            <Link
              href={href}
              aria-label={label}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              {icon}
            </Link>
          </li>
        ))}
      </ul>

      {/* Copyright — bottom on mobile, right on desktop */}
      <p className="
        text-xs text-gray-500 font-[var(--font-dubai)] text-center
        md:order-3 md:flex-1 md:text-left md:text-sm
      ">
        Copyright &copy; {new Date().getFullYear()} - All rights reserved
      </p>

    </footer>
  )
}

export default Footer