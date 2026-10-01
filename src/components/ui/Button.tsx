'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] rounded-full',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-neon-pink)] hover:brightness-110',
        outline:
          'border-2 border-white/10 bg-transparent text-[var(--foreground)] hover:border-white/20 hover:bg-white/10',
        ghost:
          'bg-transparent text-[var(--foreground)] hover:bg-white/10',
        link:
          'bg-transparent text-[var(--primary)] underline-offset-4 hover:underline',
        destructive:
          'bg-[var(--destructive)] text-white shadow-[0_4px_15px_rgba(255,68,68,0.3)] hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-5 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      disabled,
      children,
      type = 'button',
      'aria-busy': ariaBusy,
      ...props
    },
    ref
  ) => {
    const isIconSize = size?.startsWith('icon');
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-busy={ariaBusy ?? isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              className={clsx('animate-spin', isIconSize ? 'size-5' : 'size-4')}
              aria-hidden
            />
            {!isIconSize && <span>{children}</span>}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
