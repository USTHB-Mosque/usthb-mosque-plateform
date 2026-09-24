'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Skeleton } from '@/shared/ui/skeleton'

const LoansTableSkeleton: React.FC = () => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-3 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-3 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-3 w-14" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-3 w-14" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-3 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-3 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-3 w-16" />
            </TableHead>
            <TableHead className="w-10 text-end">
              <Skeleton className="ms-auto h-4 w-4 rounded" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell>
                <Skeleton className="h-4 w-36" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-lg" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-lg" />
              </TableCell>
              <TableCell>
                <Skeleton className="ms-auto h-4 w-4 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default LoansTableSkeleton
