import {
  motion,
  useMotionValue,
} from 'framer-motion'
import { forwardRef, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface CardProps {
  children: ReactNode
  className?: string
  glass?: boolean
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, glass = true, hover = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'group relative overflow-hidden rounded-3xl border border-border/50 bg-card text-card-foreground shadow-xl',
          glass && 'glass dark:glass-dark',
          'hover:shadow-2xl hover:-translate-y-1',
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={hover ? { scale: 1.02 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export { Card }

