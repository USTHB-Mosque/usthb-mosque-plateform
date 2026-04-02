"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center p-2 bg-white text-muted-foreground group-data-horizontal/tabs:h-8 group-data-horizontal/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "gap-2.5 rounded-[8px]",
        line: "gap-1 bg-transparent rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center rounded-[10px] px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all",
        "text-grey-400 hover:text-grey-500",
        "data-active:bg-primary-200 data-active:text-blue-400",
        className
      )}
      {...props}
    />
  )
}

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
