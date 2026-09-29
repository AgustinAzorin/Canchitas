// TextField del design system (GUIDELINES, Componentes > TextField): label siempre visible,
// campo de 48 px en `text-body`, ayuda o error debajo en `text-caption`.
import { CircleAlert } from 'lucide-react';
import { useId, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  ayuda?: string | undefined;
  error?: string | undefined;
}

export function TextField({ label, ayuda, error, className, id, ...props }: TextFieldProps) {
  const generado = useId();
  const campo = id ?? generado;
  const descripcion =
    error === undefined ? (ayuda === undefined ? undefined : `${campo}-ayuda`) : `${campo}-error`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={campo} className="text-label">
        {label}
      </label>
      <input
        id={campo}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={descripcion}
        className={cn(
          'h-12 w-full rounded-md border border-input bg-surface px-3 text-body text-surface-foreground',
          'focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-offset-0',
          'disabled:bg-muted disabled:text-muted-foreground',
          error !== undefined && 'border-destructive',
        )}
        {...props}
      />
      {error === undefined ? (
        ayuda !== undefined && (
          <p id={descripcion} className="text-caption text-muted-foreground">
            {ayuda}
          </p>
        )
      ) : (
        <p id={descripcion} className="flex items-start gap-1 text-caption text-destructive">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
