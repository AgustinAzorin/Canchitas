// Button del design system (GUIDELINES, Componentes > Button).
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const variantes = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/92 active:bg-primary/88',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/92 active:bg-secondary/88',
  outline: 'border border-input bg-transparent text-foreground hover:bg-accent',
  ghost: 'bg-transparent text-primary hover:bg-accent',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/92',
} as const;

const tamanos = {
  md: 'h-10 px-4',
  lg: 'h-12 w-full px-4',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof variantes;
  tamano?: keyof typeof tamanos;
  /** Spinner en lugar del ícono; el texto y el ancho no cambian. */
  cargando?: boolean;
  icono?: ReactNode;
}

export function Button({
  variante = 'primary',
  tamano = 'md',
  cargando = false,
  icono,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        // Objetivo táctil de 48 px aunque el botón se vea de 40 (GUIDELINES, accesibilidad).
        'relative inline-flex items-center justify-center gap-2 rounded-md text-label',
        'transition-colors duration-fast ease-standard',
        'before:absolute before:-inset-y-1 before:inset-x-0 before:content-[""]',
        'disabled:pointer-events-none disabled:opacity-40',
        variantes[variante],
        tamanos[tamano],
        className,
      )}
      {...props}
    >
      {cargando ? <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" /> : icono}
      {children}
    </button>
  );
}
