'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          'flex min-h-[120px] w-full rounded-xl border bg-white/5 px-4 py-3 text-base text-[var(--foreground)] resize-y',
          'placeholder:text-[var(--muted-foreground)] placeholder:text-base',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-mid)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
          'border-white/10 hover:border-white/20',
          error
            ? 'border-[var(--destructive)] focus-visible:ring-[var(--destructive)]'
            : 'focus-visible:border-[var(--accent-mid)]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white/[0.02]',
          className
        )}
        aria-invalid={ariaInvalid ?? error}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
