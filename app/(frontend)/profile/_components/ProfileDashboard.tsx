'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivityRegistration, BookFavorite, Loan, Media, User } from '@/payload-types'
import ProfileAccountForm from './ProfileAccountForm'
import ProfilePasswordForm from './ProfilePasswordForm'
import ProfileFavoritesGrid from './ProfileFavoritesGrid'
import ProfileLoansList from './ProfileLoansList'
import ProfileRegistrationsList from './ProfileRegistrationsList'

export type ProfileDashboardData = {
  user: User
  favorites: BookFavorite[]
  registrations: ActivityRegistration[]
  loans: Loan[]
}

type ProfileDashboardProps = {
  data: ProfileDashboardData
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ data }) => {
  const { user, favorites, registrations, loans } = data
  const media = user.profilePicture as Media | undefined

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto pb-16 px-4 sm:px-6">
      <div className="space-y-2 text-center sm:text-right py-4">
        <p className="text-secondary text-4xl md:text-5xl font-khalid">الملف الشخصي</p>
        <p className="text-muted-foreground text-base md:text-lg">
          إدارة بياناتك، مفضلتك، تسجيلاتك في الأنشطة وإعارات المكتبة.
        </p>
      </div>

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center gap-6 border-b border-border/60 bg-background-2/80 py-6 px-6">
          <Avatar className="h-20 w-20 border-2 border-primary/20 flex-shrink-0">
            <AvatarImage src={media?.url || ''} alt={media?.alt || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold font-dubai">
              {user.fullName?.substring(0, 2).toUpperCase() ||
                user.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-2xl font-bold font-dubai truncate">
              {user.fullName || '—'}
            </CardTitle>
            <CardDescription className="text-base text-foreground/80 break-all">
              {user.email}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="account" className="w-full gap-6">
        <TabsList className="flex w-full flex-wrap h-auto gap-0 border-b border-border bg-transparent p-0">
          <TabsTrigger value="account" className="flex-1 min-w-[120px]">
            الحساب
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 min-w-[120px]">
            المفضلة
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex-1 min-w-[120px]">
            الأنشطة
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex-1 min-w-[120px]">
            الإعارات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6 mt-6 px-2 sm:px-4">
          <ProfileAccountForm defaultFullName={user.fullName || ''} />
          <ProfilePasswordForm />
        </TabsContent>

        <TabsContent value="favorites" className="mt-6 px-2 sm:px-4">
          <ProfileFavoritesGrid favorites={favorites} />
        </TabsContent>

        <TabsContent value="activities" className="mt-6 px-2 sm:px-4">
          <ProfileRegistrationsList registrations={registrations} />
        </TabsContent>

        <TabsContent value="loans" className="mt-6 px-2 sm:px-4">
          <ProfileLoansList loans={loans} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfileDashboard
