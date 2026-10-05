'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Jerarquía de botones de toda la app:
 * - default: la acción principal de cada pantalla (degradado de marca con brillo)
 * - outline: acciones secundarias (fondo sólido y borde visible)
 * - danger: salir, eliminar… (contorno rojo)
 * - destructive: confirmar algo irreversible (rojo sólido, solo en diálogos)
 * - ghost / link: acciones de texto
 * Para enlaces con aspecto de botón: className={buttonVariants({ … })}.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] rounded-full',
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,var(--primary),var(--accent-mid))] font-bold text-[var(--primary-foreground)] shadow-[0_0_22px_var(--primary-glow)] hover:brightness-110 hover:shadow-[0_0_30px_var(--primary-glow)]',
        outline:
          'border-2 border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:border-[var(--secondary)] hover:text-[var(--secondary)]',
        danger:
          'border-2 border-[color-mix(in_srgb,var(--destructive)_70%,transparent)] bg-[var(--destructive-soft)] text-[var(--destructive)] hover:bg-[color-mix(in_srgb,var(--destructive)_22%,transparent)]',
        destructive:
          'bg-[var(--destructive)] font-bold text-[var(--primary-foreground)] shadow-[0_4px_15px_var(--destructive-soft)] hover:brightness-110',
        ghost:
          'bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-raised)]',
        link:
          'bg-transparent text-[var(--primary)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-[15px]',
        lg: 'h-12 px-6 text-base sm:h-14 sm:px-8 sm:text-lg',
        icon: 'h-11 w-11 p-0',
        'icon-sm': 'h-9 w-9 p-0',
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
