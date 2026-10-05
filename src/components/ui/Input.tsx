'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, type = 'text', 'aria-invalid': ariaInvalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={clsx(
          'flex h-11 w-full rounded-xl border bg-[var(--surface-raised)] px-4 py-3 text-base text-[var(--foreground)]',
          'placeholder:text-[var(--muted-foreground)] placeholder:text-base',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-mid)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
          'border-[var(--surface-border)] hover:border-[var(--muted-foreground)]',
          error
            ? 'border-[var(--destructive)] focus-visible:ring-[var(--destructive)]'
            : 'focus-visible:border-[var(--accent-mid)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        aria-invalid={ariaInvalid ?? error}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
