'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { Button } from '../ui/button'
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react'
import { DOTS, usePagination } from '@/hooks/use-pagination'
import { flushSync } from 'react-dom'

function PaginationRoot({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn(className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & React.ComponentProps<typeof Button>

function PaginationLink({ className, isActive, ...props }: PaginationLinkProps) {
  return (
    <Button
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      size="icon-lg"
      data-active={isActive}
      variant={isActive ? 'outline' : 'default'}
      className={cn('rounded-[4px] border border-border', className)}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <Button
      data-slot="pagination-previous"
      aria-label="Go to previous page"
      color="default"
      className={cn('rounded-[4px] border border-border h-10', className)}
      dir={dir}
      {...props}
    >
      {dir === 'ltr' ? <ChevronLeft /> : <ChevronRight />}
      <span className="hidden md:inline-block">{children}</span>
    </Button>
  )
}

function PaginationNext({
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <Button
      data-slot="pagination-next"
      aria-label="Go to next page"
      color="default"
      className={cn('rounded-[4px] border border-border h-10', className)}
      dir={dir}
      {...props}
    >
      <span className="hidden md:inline-block">{children}</span>
      {dir === 'ltr' ? <ChevronRight /> : <ChevronLeft />}
    </Button>
  )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        'flex items-center rounded-[4px] justify-center border border-border hover:bg-transparent',
        className,
      )}
      {...props}
    >
      <Ellipsis className="size-4" />
      <span className="sr-only">More pages</span>
    </Button>
  )
}

export interface PaginationProps {
  totalPages: number
  page: number
  onPageChange: (page: number) => void

  previousButtonLabel?: string
  nextButtonLabel?: string
  dir?: 'rtl' | 'ltr'
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  previousButtonLabel,
  nextButtonLabel,
  dir = 'ltr',
}: PaginationProps) {
  const pagination = usePagination({ page, totalPages })

  if (!totalPages || totalPages <= 1 || !pagination) return null

  const nextDisabled = page >= totalPages
  const prevDisabled = page <= 1

  const onNextClick = (p: number) => {
    if (nextDisabled) return

    onPageChange(p)
  }
  const onPrevClick = (p: number) => {
    if (prevDisabled) return
    onPageChange(p)
  }

  return (
    <div className="flex justify-center items-center w-full">
      <PaginationRoot>
        <PaginationContent dir={dir}>
          <PaginationItem>
            <PaginationPrevious
              disabled={prevDisabled}
              onClick={() => {
                flushSync(() => {
                  onPrevClick(page - 1)
                })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              dir={dir}
            >
              {previousButtonLabel}
            </PaginationPrevious>
          </PaginationItem>
          {pagination.map((item, index) => {
            const key = `${item}-${index}`
            if (item === DOTS) {
              return (
                <PaginationItem key={key}>
                  <PaginationEllipsis />
                </PaginationItem>
              )
            }

            return (
              <PaginationItem key={key}>
                <PaginationLink
                  onClick={() => {
                    onPageChange(item as number)
                    if (page !== item) window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  isActive={item === page}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              disabled={nextDisabled}
              onClick={() => {
                flushSync(() => {
                  onNextClick(page + 1)
                })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              dir={dir}
            >
              {nextButtonLabel}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </PaginationRoot>
    </div>
  )
}

export { Pagination }
