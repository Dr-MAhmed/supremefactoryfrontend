import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

const Table = ({ className, ...props }: TableProps) => (
  <table
    className={cn(
      'w-full caption-bottom text-sm relative [&>thead]:sticky top-0 z-10',
      className
    )}
    {...props}
  />
)

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

const TableHeader = ({ className, ...props }: TableHeaderProps) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
)

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

const TableBody = ({ className, ...props }: TableBodyProps) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}

const TableRow = ({ className, ...props }: TableRowProps) => (
  <tr
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
)

interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {}

const TableHead = ({ className, ...props }: TableHeadProps) => (
  <th
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
)

interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {}

const TableCell = ({ className, ...props }: TableCellProps) => (
  <td
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
)

interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {}

const TableCaption = ({ className, ...props }: TableCaptionProps) => (
  <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
)

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }

