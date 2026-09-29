// Alert del design system (GUIDELINES, Componentes > Alert y Toast): ícono más texto, fondo del
// rol con su `-foreground`. El color refuerza; el texto dice qué pasa.
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const variantes = {
  info: { clases: 'bg-info text-info-foreground', Icono: Info },
  success: { clases: 'bg-success text-success-foreground', Icono: CircleCheck },
  warning: { clases: 'bg-warning text-warning-foreground', Icono: TriangleAlert },
  destructive: { clases: 'bg-destructive text-destructive-foreground', Icono: CircleAlert },
} as const;

export interface AlertProps {
  variante: keyof typeof variantes;
  children: ReactNode;
  /** `alert` interrumpe al lector de pantalla; `status` espera. */
  role?: 'alert' | 'status';
  className?: string;
}

export function Alert({ variante, children, role = 'status', className }: AlertProps) {
  const { clases, Icono } = variantes[variante];
  return (
    <div
      role={role}
      className={cn('flex items-start gap-2 rounded-md p-3 text-body-sm', clases, className)}
    >
      <Icono aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
