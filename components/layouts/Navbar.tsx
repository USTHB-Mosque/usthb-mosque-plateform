import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Settings } from 'lucide-react'

const Navbar: React.FC = () => {
  const user = {
    name: 'Ramzy Kemmoun',
    email: 'ramzy@example.com',
    image:
      'https://avatars.githubusercontent.com/u/96486453?s=400&u=659590409f3e1ed402269f502c8a174f3d7570a7&v=4',
  }

  return (
    <nav className="flex items-center justify-end p-4 border-b bg-background/95 backdrop-blur">
      <div className="flex items-center gap-4 px-6">
        <div className="hidden md:flex flex-col items-end">
          <p className="text-sm font-bold font-dubai leading-none">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="h-9 w-9 border-2 border-primary/10 hover:border-primary/30 transition-all">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel className="font-bold">حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer gap-2">
              <User className="size-4" />
              <span>الملف الشخصي</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer gap-2">
              <Settings className="size-4" />
              <span>الإعدادات</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive">
              <LogOut className="size-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}

export default Navbar
