'use client'
import React from 'react'
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
import { LogOut, User, Settings } from 'lucide-react'
import { Media } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { useGetProfileQuery } from '@/lib/apis/auth/queries'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/actions/auth/logout'
import { toast } from 'sonner'

const Navbar: React.FC = () => {
  const { data: { user } = { user: undefined } } = useGetProfileQuery()
  const router = useRouter()

  const media = user?.profilePicture as Media

  const onLogout = async () => {
    await logout()
    localStorage.removeItem('access_token')
    toast.success('تم تسجيل الخروج بنجاح')
    router.push('/auth/login')
  }

  return (
    <nav className="flex items-center justify-end p-4 border-b bg-background/95 backdrop-blur">
      <div className="flex items-center gap-4 px-6">
        {user ? (
          <>
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-bold font-dubai leading-none">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-9 w-9 border-2 border-primary/10 hover:border-primary/30 transition-all">
                  <AvatarImage src={media?.url || ''} alt={media?.alt || 'User profile picture'} />
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
                    <Link href="/profile" className="flex items-center gap-2 w-full">
                      <User className="size-4" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <Link href="/profile" className="flex items-center gap-2 w-full">
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
          <Link href="/auth/login">
            <Button>تسجيل الدخول</Button>
          </Link>
        )}
      </div>
    </nav>
  )
}

export default Navbar