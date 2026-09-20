'use client'

import React from 'react'
import { Monitor, Smartphone, MoreVertical, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu'

type Device = {
  id: string
  name: string
  icon: React.ElementType
  location: string
  registeredAt: string
  lastLogin: string
}

const devices: Device[] = [
  {
    id: '1',
    name: 'HP Pavilion Laptop',
    icon: Monitor,
    location: 'باب الزوار، الجزائر',
    registeredAt: '12/02/2026 - 10:30PM',
    lastLogin: '12/02/2026 - 10:30PM',
  },
  {
    id: '2',
    name: 'iPhone 15 Pro',
    icon: Smartphone,
    location: 'باب الزوار، الجزائر',
    registeredAt: '10/01/2026 - 02:15PM',
    lastLogin: '15/02/2026 - 08:45AM',
  },
]

type ConnectedDevicesProps = {
  onBack: () => void
}

const ConnectedDevices: React.FC<ConnectedDevicesProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col self-stretch gap-6">
      <div className="self-stretch bg-background-2 rounded-xl border border-solid border-stroke-grey">
        {devices.map((device, index) => {
          const Icon = device.icon
          return (
            <div
              key={device.id}
              className={`flex justify-between items-center self-stretch p-5 ${
                index !== devices.length - 1 ? 'border-b border-stroke-grey' : ''
              }`}
            >
              {/* Info side (right in RTL) */}
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-main-15">
                  <Icon className="h-5 w-5 text-primary-300" />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-base font-alyamama text-[#243245]">{device.name}</span>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-alyamama text-grey-500">
                      المكان: {device.location}
                    </span>
                    <span className="text-sm font-alyamama text-grey-500">
                      تاريخ التسجيل: {device.registeredAt}
                    </span>
                    <span className="text-sm font-alyamama text-grey-500">
                      آخر دخول: {device.lastLogin}
                    </span>
                  </div>
                </div>
              </div>

              {/* Three dots menu (left in RTL) */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black/5 transition-colors cursor-pointer outline-none">
                  <MoreVertical className="h-5 w-5 text-grey-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <span>حذف الجهاز</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ConnectedDevices
