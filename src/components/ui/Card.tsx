import type { ElementType, ReactNode } from 'react';
import { cn } from './cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Render as a different element (e.g. 'article', 'section'). Default 'div'. */
  as?: ElementType;
  /** Adds hover/focus lift + copper hairline. Use for clickable cards. */
  interactive?: boolean;
}

/**
 * Surface primitive: parchment panel with a hairline border and soft shadow.
 * The base building block for every boxed region in the app.
 */
export function Card({
  children,
  className,
  as: Tag = 'div',
  interactive = false,
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-xl border border-amber-200 bg-parchment shadow-sm',
        interactive &&
          'transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md focus-within:border-amber-400',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
