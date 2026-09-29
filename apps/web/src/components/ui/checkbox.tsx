// Checkbox del design system (GUIDELINES, Componentes > Select, Checkbox y Switch).
import { CircleAlert } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  error?: string | undefined;
}

export function Checkbox({ children, error, className, id, ...props }: CheckboxProps) {
  const generado = useId();
  const campo = id ?? generado;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* La fila entera es tocable: 48 px de alto mínimo. */}
      <div className="flex min-h-12 items-center gap-3">
        <input
          id={campo}
          type="checkbox"
          aria-invalid={error !== undefined || undefined}
          aria-describedby={error === undefined ? undefined : `${campo}-error`}
          className="size-5 shrink-0 rounded-sm border-input accent-primary"
          {...props}
        />
        <label htmlFor={campo} className="text-body-sm">
          {children}
        </label>
      </div>
      {error !== undefined && (
        <p id={`${campo}-error`} className="flex items-start gap-1 text-caption text-destructive">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
