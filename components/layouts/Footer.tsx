import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'

const SOCIAL_LINKS = [
  { href: '#', icon: <Facebook size={18} />, label: 'Facebook' },
  { href: '#', icon: <Instagram size={18} />, label: 'Instagram' },
  { href: '#', icon: <Linkedin size={18} />, label: 'LinkedIn' },
  { href: '#', icon: <Twitter size={18} />, label: 'Twitter' },
]

const Footer: React.FC = () => {
  return (
    <footer className="flex flex-col items-center gap-4 bg-fill-contrast px-6 py-6 md:flex-row md:justify-between md:px-16 md:py-5">
      <div className="flex justify-center md:order-2 md:flex-1">
        <Link href="/">
          <Image src="/static/images/logo-icon.svg" alt="الشعار" width={23} height={40} />
        </Link>
      </div>

      <ul className="flex items-center gap-4 md:order-1 md:flex-1">
        {SOCIAL_LINKS.map(({ href, icon, label }) => (
          <li key={label}>
            <Link
              href={href}
              aria-label={label}
              className="text-grey-300 transition-colors duration-200 hover:text-grey-500"
            >
              {icon}
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-grey-400 text-center font-dubai md:order-3 md:flex-1 md:text-start md:text-sm">
        جميع الحقوق محفوظة &copy; {new Date().getFullYear()} - مسجد جامعة باب الزوار
      </p>
    </footer>
  )
}

export default Footer