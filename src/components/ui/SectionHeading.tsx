import type { ReactNode } from 'react';
import { cn } from './cn';

interface SectionHeadingProps {
  title: ReactNode;
  /** Small uppercase kicker above the title. */
  eyebrow?: ReactNode;
  /** Supporting copy below the title. */
  description?: ReactNode;
  /** Right-aligned actions (e.g. buttons). */
  actions?: ReactNode;
  className?: string;
  /** Heading level for correct document outline. Default 'h2'. */
  as?: 'h1' | 'h2' | 'h3';
}

/** Consistent section header: eyebrow + title + description + optional actions. */
export function SectionHeading({
  title,
  eyebrow,
  description,
  actions,
  className,
  as: Heading = 'h2',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-600">
            {eyebrow}
          </p>
        ) : null}
        <Heading className="font-display text-2xl font-bold text-amber-900">
          {title}
        </Heading>
        {description ? (
          <p className="mt-1.5 text-sm text-amber-800">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}
