'use client'
import React, { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Settings, Menu, X, LayoutDashboard } from 'lucide-react'
import { Media } from '@/payload-types'
import { useGetProfileQuery } from '@/lib/apis/auth-api'
import LandingCtaButton from '@/components/ui/landing/LandingCtaButton'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/actions/auth/logout'
import { toast } from 'sonner'
import { getImageUrl } from '@/utils/image-utils'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const navLinks = [
  { label: 'الرئيسية', href: '/' },
  { label: 'من نحن', href: '/about-us' },
  { label: 'المكتبة', href: '/library' },
  { label: 'الأنشطة', href: '/activities' },
  { label: 'المقالات', href: '/articles' },
  { label: 'تواصل معنا', href: '/contact-us' },
]

const Navbar: React.FC = () => {
  const { data: { user } = { user: undefined } } = useGetProfileQuery()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const media = user?.profilePicture as Media
  const avatarUrl = getImageUrl(media?.url)

  const onLogout = async () => {
    await logout()
    toast.success('تم تسجيل الخروج بنجاح')
    router.push('/auth/login')
  }

  const NavLink: React.FC<{ label: string; href: string; mobile?: boolean }> = ({
    label,
    href,
    mobile = false,
  }) => {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={() => setMenuOpen(false)}
        className={
          mobile
            ? cn('block text-base font-medium transition-colors', isActive ? 'text-primary-300' : 'text-foreground hover:text-primary-300')
            : cn(
                'relative text-sm font-medium transition-colors duration-200',
                isActive ? 'text-primary-300' : 'text-foreground hover:text-primary-300',
              )
        }
      >
        {label}
        {!mobile && (
          <span
            className="absolute bottom-[-3px] start-0 h-[1.5px] bg-primary-300 transition-all duration-300 ease-out"
            style={{ width: isActive ? '100%' : '0%' }}
          />
        )}
      </Link>
    )
  }

  return (
    <header
      dir="rtl"
      className="sticky top-0 start-0 end-0 z-50 w-full border-b bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-16">
        <Link href="/" className="shrink-0">
          <Image
            src="/static/images/logo-horizontal.svg"
            alt="الشعار"
            width={90}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden lg:block">
          <ul className="flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink label={link.label} href={link.href} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden lg:flex flex-col items-end">
                <p className="text-sm font-bold font-dubai leading-none">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="h-9 w-9 border-2 border-primary/10 hover:border-primary/30 transition-all">
                    <AvatarImage src={avatarUrl} alt={media?.alt || 'User profile picture'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user?.fullName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 mt-2">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-bold">حسابي</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <Link href="/user/dashboard" className="flex items-center gap-2 w-full">
                        <LayoutDashboard className="size-4" />
                        <span>لوحة التحكم</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <Link href="/user/settings" className="flex items-center gap-2 w-full">
                        <Settings className="size-4" />
                        <span>الإعدادات</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      onClick={onLogout}
                    >
                      <LogOut className="size-4" />
                      <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden lg:block">
              <LandingCtaButton
                label="تسجيل الدخول"
                onClick={() => router.push('/auth/login')}
                className="[&_span]:text-base"
              />
            </div>
          )}

          <button
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-md p-2 text-foreground transition-colors hover:bg-muted lg:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 lg:hidden',
          menuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav className="border-t px-6 pb-6 pt-4">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink label={link.label} href={link.href} mobile />
              </li>
            ))}
          </ul>
          {user ? (
            <div className="mt-6 flex flex-col gap-3 border-t pt-4">
              <div className="flex items-center gap-3 px-2">
                <Avatar className="h-8 w-8 border border-primary/20">
                  <AvatarImage src={avatarUrl} alt={media?.alt || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {user?.fullName?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Link
                href="/user/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
              >
                <LayoutDashboard className="size-4" />
                لوحة التحكم
              </Link>
              <button
                onClick={() => { setMenuOpen(false); onLogout() }}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-destructive hover:bg-muted"
              >
                <LogOut className="size-4" />
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <LandingCtaButton
                label="تسجيل الدخول"
                onClick={() => router.push('/auth/login')}
              />
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar