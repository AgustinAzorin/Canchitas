// El tiempo entra por este puerto: el dominio nunca llama a Date.now() (ADR 0006).
export interface Clock {
  ahora(): Date;
}

export const relojDelSistema: Clock = {
  ahora: () => new Date(),
};
