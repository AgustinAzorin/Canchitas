// Todos los textos visibles de la web (ADR 0002). Voseo, sin exclamaciones ni emojis.
export const mensajes = {
  app: {
    nombre: 'Canchitas',
    descripcion: 'Organizá los partidos con tu grupo y encontrá canchas.',
  },
  salud: {
    titulo: 'Estado del servicio',
    consultando: 'Consultando la API…',
    enLinea: 'La API está en línea.',
    version: 'Versión',
    horaDelServidor: 'Hora del servidor',
    baseCaida: 'La API responde, pero la base de datos no. Probá de nuevo en unos minutos.',
    sinConexion: 'No pudimos conectarnos con la API. Revisá tu conexión y probá de nuevo.',
  },
  comun: {
    volverAlInicio: 'Volver al inicio',
    sinConexion: 'Sin conexión. No se guardó nada; probá de nuevo.',
    errorInesperado: 'Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.',
    campoObligatorio: 'Completá este campo.',
  },
  cuentas: {
    campos: {
      email: 'Mail',
      contrasena: 'Contraseña',
      contrasenaNueva: 'Contraseña nueva',
      nombreUsuario: 'Nombre de usuario',
      fechaNacimiento: 'Fecha de nacimiento',
    },
    ayudas: {
      contrasena: 'Entre 8 y 128 caracteres.',
      nombreUsuario:
        'De 3 a 20 letras, números, punto o guion bajo. Te pueden buscar por este nombre.',
      fechaNacimiento: 'Tenés que tener 18 años o más.',
    },
    validacion: {
      email: 'Escribí un mail válido, por ejemplo nombre@mail.com.',
      contrasenaCorta: 'La contraseña tiene que tener al menos 8 caracteres.',
      contrasenaLarga: 'La contraseña puede tener hasta 128 caracteres.',
      nombreUsuario: 'Usá de 3 a 20 letras sin tilde, números, punto o guion bajo.',
      privacidad: 'Para crear la cuenta tenés que aceptar la política de privacidad.',
    },
    /** Por `type` del problem+json de la API (ADR 0008). */
    errores: {
      'email-en-uso':
        'Ese mail ya está en uso. Si es tuyo, iniciá sesión o recuperá la contraseña.',
      'nombre-de-usuario-en-uso': 'Ese nombre de usuario ya está en uso. Probá con otro.',
      'nombre-de-usuario-invalido': 'Usá de 3 a 20 letras sin tilde, números, punto o guion bajo.',
      'menor-de-edad': 'Tenés que tener 18 años o más para registrarte.',
      'fecha-invalida': 'Esa fecha no existe. Revisala.',
      'privacidad-no-aceptada': 'Para crear la cuenta tenés que aceptar la política de privacidad.',
      'credenciales-invalidas': 'El mail o la contraseña no son correctos.',
      'cuenta-bloqueada':
        'Hubo 5 intentos fallidos seguidos. Por seguridad, esperá 15 minutos para volver a intentar.',
      'enlace-invalido': 'El enlace venció o no es válido.',
      'enlace-usado': 'Este enlace ya se usó.',
      'solicitud-invalida': 'Revisá los datos: alguno no tiene el formato esperado.',
    },
    registro: {
      titulo: 'Crear cuenta',
      privacidadAntes: 'Leí y acepto la ',
      privacidadLink: 'política de privacidad',
      enviar: 'Crear cuenta',
      yaTenesCuenta: '¿Ya tenés cuenta?',
      ingresar: 'Iniciá sesión',
      listoTitulo: 'Revisá tu mail',
      listo: (email: string) =>
        `Te mandamos un enlace a ${email} para activar tu cuenta. Vence en 24 horas.`,
      listoIngresar: 'Ir a iniciar sesión',
    },
    ingreso: {
      titulo: 'Iniciar sesión',
      enviar: 'Ingresar',
      olvido: 'Me olvidé la contraseña',
      sinCuenta: '¿No tenés cuenta?',
      registrarse: 'Creá una',
    },
    verificacion: {
      titulo: 'Verificar mail',
      verificando: 'Verificando el enlace…',
      activa: 'Listo, tu cuenta está activa.',
      continuar: 'Ir al inicio',
      reenviarTitulo: 'Pedí un enlace nuevo',
      reenviar: 'Reenviar mail',
      reenviado: 'Si la cuenta existe y no está verificada, te mandamos un enlace nuevo.',
      sinVerificar: 'Tu mail no está verificado. Hasta verificarlo no vas a poder unirte a grupos.',
    },
    recuperacion: {
      titulo: 'Recuperar contraseña',
      explicacion: 'Te mandamos un enlace para definir una contraseña nueva. Vence en 1 hora.',
      enviar: 'Mandar enlace',
      enviado:
        'Si hay una cuenta con ese mail, te mandamos el enlace. Revisá también el correo no deseado.',
      nuevaTitulo: 'Definir contraseña nueva',
      nuevaEnviar: 'Guardar contraseña',
      nuevaLista: 'Listo, cambiaste la contraseña. Cerramos las sesiones que tenías abiertas.',
      nuevaIngresar: 'Iniciar sesión',
      pedirOtro: 'Pedir otro enlace',
    },
    sesion: {
      consultando: 'Consultando tu sesión…',
      hola: (nombre: string) => `Hola, ${nombre}`,
      cerrar: 'Cerrar sesión',
      sinSesion: 'Iniciá sesión para ver tus grupos y partidos.',
      ingresar: 'Iniciar sesión',
      crearCuenta: 'Crear cuenta',
    },
    privacidad: {
      titulo: 'Política de privacidad',
      provisoria:
        'Texto provisorio: la política definitiva se publica antes del lanzamiento (Ley 25.326).',
      parrafos: [
        'Canchitas guarda tu mail, tu nombre de usuario y tu fecha de nacimiento para crear y proteger tu cuenta.',
        'Tu mail se usa solo para verificar la cuenta y para recuperar la contraseña. No se muestra a otras personas.',
        'Tu fecha de nacimiento se usa solo para comprobar que tenés 18 años o más.',
      ],
    },
  },
} as const;
