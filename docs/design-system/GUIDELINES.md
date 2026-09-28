# Canchitas — Design System · v0.1.0

## Supuestos y alcance

**Qué se preguntó.**
- Personalidad: utilitaria y rápida.
- Referencias: Strava y Promiedos/SofaScore.
- Color de marca: a criterio del diseño.
- Stack: Next.js + Tailwind v4 en web, Jetpack Compose + Material 3 en Android.

**Qué sale del SRS** (`claude/SRS.md`):
- público adulto (18+) en AMBA;
- uso mayormente desde el celular y con una mano;
- español rioplatense;
- WCAG 2.1 AA (RNF-019);
- web desde 360 px sin scroll horizontal (RNF-020).

**Supuestos tomados sin preguntar:**
- Modo claro y oscuro, siguiendo el sistema. Es el default de la skill; además mucha consulta ocurre de noche, antes del partido.
- Densidad media-compacta, por las listas de jugadores y las tablas de stats.
- Package Android `com.canchitas.app.ui.theme`.
- Dynamic color (Material You) desactivado, porque pisa la marca.

**Fuera de alcance de v0.1:**
- logo e ícono de la app;
- set de íconos: se recomienda uno solo de trazo, Lucide en web y Material Symbols Rounded en Android, sin mezclar;
- ilustraciones;
- estilo del mapa (teselas OSM por defecto, ver *Directorio*).

**Plataformas:** web (Next.js App Router + Tailwind v4) y Android (Compose + Material 3 ≥ 1.2).

## Principios

1. **El color significa algo.** La interfaz es neutra por defecto. El color aparece solo para la acción principal (`primary`) o para comunicar un estado (`success`, `warning`, `destructive`). Si un elemento es de color y no es una acción ni un estado, sobra el color.
2. **Una acción principal por pantalla.** En la tarjeta de partido la acción es "Confirmo"; en la votación, "Votar". Si aparece un segundo botón `primary`, uno de los dos pasa a `secondary` o a botón de texto.
3. **Los números se leen como en un marcador.** Resultados, cupos, goles y montos usan cifras tabulares (`tabular-nums` / `fontFeatureSettings = "tnum"`). Los números grandes van en `font-display`. Una columna de stats que "baila" está mal.
4. **Resolver en dos toques.** Confirmar, bajarse y votar se hacen desde la tarjeta, sin entrar al detalle. Los objetivos táctiles son de 48 dp, aunque el elemento se vea más chico.
5. **El estado se lee sin color.** Todo estado lleva texto, y en lo posible ícono: "Confirmado", "En espera 2°", "Debe $ 6.000". El color refuerza, no reemplaza (hay usuarios daltónicos y hay sol en la cancha).

## Color

### Marca

La marca es el **azul cobalto** (`brand`, semilla en el paso 600). Se eligió por descarte funcional: la app vive de estados (confirmado, en espera, cancelado, pagado, deuda, avalado, rechazado). El verde, el ámbar y el rojo tienen que quedar libres para ellos.
- Un verde césped se confundiría con "confirmado".
- Un naranja tipo Strava se confundiría con la advertencia y con el rojo de "pinchar".

El azul, sin el oro, tampoco le pone camiseta de club a la app.

### Roles semánticos

| Rol | Para qué |
|---|---|
| `background` | Fondo de pantalla. |
| `surface` | Cards, hojas, diálogos, filas de lista. |
| `foreground` / `surface-foreground` | Texto principal. |
| `muted` | Fondos secundarios: celdas de tabla alternadas, skeletons, chips inactivos. |
| `muted-foreground` | Texto secundario: fecha, zona, "hace 2 h", encabezados de tabla. |
| `border` | Separadores y bordes de cards. Decorativo, no delimita controles. |
| `input` | Borde de campos, checkboxes y switches apagados (3:1 verificado). |
| `ring` | Anillo de foco. |
| `primary` | Acción principal y elementos seleccionados (tab activa, opción votada). |
| `primary-container` | Fondo de selección suave: opción votada, chip de filtro activo, estado "Confirmación abierta". |
| `secondary` | Botón secundario relleno ("Me bajo", "Compartir"). |
| `accent` | Hover y resaltado muy suave de filas (tu fila en una tabla de stats). |
| `destructive` | Cancelar partido, expulsar, borrar cuenta; errores. |
| `success` | Confirmado, pagado, avalado, cancha aprobada. |
| `warning` | Lista de espera, pendiente de aprobación, deuda, cupo incompleto. |
| `info` | Avisos neutros. Es la marca. |
| `overlay` | Scrim de diálogos y bottom sheets. |
| `team-light` / `team-dark` | Identidad de los dos equipos de un partido ("claros" y "oscuros"). |
| `team-dark-border` | Borde obligatorio de todo elemento `team-dark` (en oscuro, sin borde se funde con el fondo). |

### Estados del producto → rol

| Estado (SRS) | Rol | Etiqueta |
|---|---|---|
| Confirmación abierta | `primary-container` | "Abierto · 6/10" |
| Completo | `secondary` | "Completo" |
| Confirmado (vos) | `success` | "Confirmado" |
| En lista de espera | `warning` | "En espera 2°" |
| Se bajó | `muted` | "Se bajó" (con antelación, solo admins) |
| Cancelado ("pinchado") | `destructive` | "Cancelado" + motivo |
| Jugado | `secondary` | "Jugado" |
| Pagado | `success` | "Pagó" |
| Debe | `warning` | "Debe $ 6.000" |
| Rechazo de aval | `destructive` (solo el número) | "1 rechazo" |
| Cancha pendiente de aprobación | `warning` | "Pendiente" |

La deuda es `warning` y no `destructive`: deberle $ 6.000 a un amigo no es un error. El rojo queda para lo irreversible y para los fallos.

### Reglas

- La marca ocupa poca superficie: botones principales, selección y foco. No hay headers azules, fondos de pantalla azules ni cards de marca.
- Máximo un botón `primary` visible por pantalla o por tarjeta.
- Los primitivos (`bg-brand-500`, `Palette.Brand500`) no se usan en pantallas; se usa siempre un rol. Si falta un rol, se agrega en `tokens.json`.
- En gráficos (radar, barras de votos), la serie propia usa `primary` y la comparación usa `muted-foreground`. No se inventan colores.

**Do**
- Una tarjeta de partido blanca con un solo botón azul "Confirmo" y un badge verde "Confirmado" cuando ya confirmaste.

**Don't**
- Pintar la card entera de verde cuando confirmaste.
- Usar rojo para "Debe".
- Poner el nombre del grupo en azul "para darle vida".

### Modo oscuro

- **Fondos:** `background` es el neutro más oscuro y `surface` un paso más claro. La elevación se expresa con superficies más claras; las sombras casi no se ven.
- **Marca:** `primary` sube a un azul más claro con texto oscuro encima. En oscuro el botón principal tiene texto azul muy oscuro, no blanco. Es intencional y está verificado.
- **Equipos:** "oscuros" pasa a ser el neutro más oscuro, siempre con `team-dark-border`, y "claros" sigue siendo claro. La lectura claro/oscuro se mantiene en ambos temas.
- **Advertencia:** `warning` queda igual en ambos temas (ámbar claro con texto casi negro).

## Tipografía

### Familias

- **Barlow** (`font-sans`) es la familia única de la interfaz. Tiene ADN de cartelería vial/DIN: utilitaria y con aire deportivo sin ser gamer, y con buen soporte de español. Se carga en 400, 500, 600 y 700.
- **Barlow Condensed** (`font-display`) se usa **solo** para números grandes: el marcador "5 – 3", el cupo "8/10" destacado y las cifras grandes de stats en el perfil. Se carga solo en 700. No se usa para títulos de texto.

**Cifras tabulares.** Las dos familias tienen la función `tnum`, pero sus cifras por defecto son proporcionales. Toda cifra que se compare en columna o que cambie en vivo lleva cifras tabulares:
- aplica a marcador, tablas de stats, cupos, montos y conteo de votos;
- web: clase `tabular-nums`;
- Android: `style.copy(fontFeatureSettings = "tnum")`.

### Escala (ratio ~1.2, base 16)

| Rol | Tamaño / interlineado | Peso | Web | Android (M3) | Uso |
|---|---|---|---|---|---|
| `display` | 40 / 44 | 700 condensed | `text-display font-display` | `displayLarge` | Marcador, cifra protagonista de stats. |
| `h1` | 28 / 36 | 700 | `text-h1` | `headlineLarge` | Título de pantalla en web desktop; nombre del grupo en su home. |
| `h2` | 24 / 32 | 600 | `text-h2` | `headlineMedium` | Título de pantalla en móvil. |
| `h3` | 20 / 28 | 600 | `text-h3` | `titleLarge` | Título de sección, top app bar. |
| `h4` | 18 / 24 | 600 | `text-h4` | `titleMedium` | Título de card: "Sáb 10/10 · 23:00". |
| `body-lg` | 18 / 28 | 400 | `text-body-lg` | `bodyLarge` | Textos de estado vacío u onboarding. Poco uso. |
| `body` | 16 / 24 | 400 | `text-body` | `bodyMedium` | Texto general y **todos los campos de formulario**. |
| `body-sm` | 14 / 20 | 400 | `text-body-sm` | `bodySmall` | Filas de lista, celdas de tabla, metadatos. El caballo de batalla. |
| `label` | 14 / 20 | 500 | `text-label` | `labelLarge` | Botones, tabs, chips, labels de campos. |
| `caption` | 12 / 16 | 500 | `text-caption` | `labelSmall` | Encabezados de tabla, timestamps, badges. |

### Reglas

- Hasta tres niveles de jerarquía por pantalla (p. ej. `h2` + `h4` + `body-sm`).
- Los inputs nunca van por debajo de `body` (16 px): Safari en iOS hace zoom al enfocarlos, y la web se usa desde iPhone aunque no haya app iOS.
- El texto largo (reseñas, notas, política de privacidad) va en un contenedor de 65–75 caracteres (`max-w-prose`).
- Los encabezados de tabla van en `caption` con `muted-foreground`, sin mayúsculas sostenidas. Las abreviaturas de stats son PJ, PG, PE, PP, G, A y Fig, con `title`/tooltip que diga la palabra completa.
- Fechas y horas: formato 24 h y día abreviado, "sáb 10/10 · 23:00", siempre en hora de Argentina (RNF-025).
- Montos en pesos, sin decimales: `$ 6.000` (con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`).

## Espaciado y layout

Base 4. La escala nombrada en tokens y su equivalente en las plataformas:

| Token | px/dp | Tailwind | Compose |
|---|---|---|---|
| `xs` | 4 | `1` | `Spacing.xs` |
| `sm` | 8 | `2` | `Spacing.sm` |
| `md` | 12 | `3` | `Spacing.md` |
| `lg` | 16 | `4` | `Spacing.lg` |
| `xl` | 24 | `6` | `Spacing.xl` |
| `2xl` | 32 | `8` | `Spacing.xxl` |
| `3xl` | 48 | `12` | `Spacing.xxxl` |

Tailwind v4 genera el espaciado con su escala numérica (`p-4` = 16 px), por eso la columna. No se usan valores fuera de la tabla (`p-5`, `gap-7`).

- **Dentro de componentes:** `sm`–`md` (densidad compacta). Card: padding `lg`. Fila de lista: padding vertical `md`, horizontal `lg`.
- **Entre elementos de una card:** `sm`. Entre cards de una lista: `md`. Entre secciones de pantalla: `xl`–`2xl`.
- **Márgenes de pantalla:** 16 en móvil (web y Android). En web desktop, contenido centrado a `max-w-3xl` para listas y detalle, y `max-w-6xl` para el directorio con mapa.
- **Web responsive:** una columna hasta 768 px. Desde ahí, el directorio pasa a mapa + lista lado a lado, y la navegación, de barra inferior a lateral.

## Forma y elevación

### Radios

| Token | Valor | Para |
|---|---|---|
| `radius.sm` | 4 | Badges rectangulares, celdas destacadas, checkbox. |
| `radius.md` | 6 | Botones, campos, chips de filtro, segmented control. |
| `radius.lg` | 10 | Cards, bottom sheets (solo esquinas superiores), popovers. |
| `radius.xl` | 14 | Diálogos. |
| `radius.full` | pill | Badges de estado, avatar, switch. Nada más. |

- El radio chico es deliberado: utilitario, no "amigable". Si una card contiene un elemento con fondo propio pegado al borde, el hijo usa `sm` (radios concéntricos: 10 − padding ≈ 4–6).
- **Compose:** M3 hace los botones pill por defecto. Hay que pasar `shape = MaterialTheme.shapes.medium` en todos los `Button`, y `shapes.large` en `Card`, que por defecto usaría `medium`. `OutlinedTextField` también lleva `shapes.medium`.

### Elevación

| Nivel | Uso |
|---|---|
| sin sombra | Cards en listas: se separan por `border`, no por sombra. Es lo normal. |
| `shadow-sm` / 1 dp | Card flotante sobre el mapa. |
| `shadow-md` / 3 dp | Menús, popovers, FAB de "Proponer cancha". |
| `shadow-lg` / 6 dp | Diálogos, bottom sheets. |

En oscuro no hay sombra visible: la separación la dan `surface` sobre `background` y el `border`.

## Movimiento

| Duración | Uso |
|---|---|
| `fast` 120 ms | Hover, pressed, toggles, checkbox, cambio de badge. |
| `normal` 200 ms | Aparición de toasts, expandir una card, cambiar de tab. |
| `slow` 300 ms | Bottom sheet, diálogo, transición de pantalla. |

- Curva `standard` para todo y `emphasized` solo para la entrada de bottom sheets y diálogos.
- No hay animaciones decorativas: ni confetti al confirmar ni marcador que "cuenta" hasta el resultado.
- Web: todo movimiento se envuelve en `motion-safe:` o se anula con `prefers-reduced-motion`.
- Android: se respeta la escala de animaciones del sistema, cosa que las APIs de Compose ya hacen.

## Componentes

Set mínimo para el MVP del SRS. Los componentes base se apoyan en Material 3 en Android y en Tailwind a mano (o shadcn/ui) en web.

> **shadcn/ui:** si lo usan, el CSS ya comparte los nombres de variables. Hay que agregar en `tokens.json` los roles `card`, `card-foreground`, `popover` y `popover-foreground` apuntando a lo mismo que `surface`, y re-exportar.

### Button

- **Cuándo:** acciones. Los links de navegación van como texto con subrayado, no como botón.
- **Variantes:**
  - `primary`: una por pantalla. "Confirmo", "Votar", "Crear partido".
  - `secondary`: acción alternativa. "Me bajo", "Compartir".
  - `outline`: borde `input` y fondo transparente. Filtros y acciones terciarias en cards.
  - `ghost`: solo texto `primary`. "Ver todos", "Cancelar" en diálogos.
  - `destructive`: "Pinchar partido", "Expulsar", "Borrar cuenta". Solo dentro de un diálogo de confirmación o al final de una pantalla de ajustes, nunca como acción principal de una card.
- **Tamaños:**
  - `md`: 40 de alto visible, target 48. Es el default.
  - `sm`: 32 visible, target 48. Solo en filas de lista o tabla.
  - `lg`: 48. CTA de pie de pantalla en móvil, ancho completo.
- **Estados:**
  - hover: `primary` con overlay de `foreground` al 8%;
  - pressed: 12%;
  - focus: anillo `ring` de 2 px, offset 2;
  - disabled: opacidad 40% y sin hover;
  - loading: spinner que reemplaza el ícono, el ancho no cambia y el texto no cambia a "Cargando…".
- **Tokens:** `primary(-foreground)`, `secondary(-foreground)`, `destructive(-foreground)`, `input`, `ring`, `radius.md`, `text-label`.
- **Web:** `inline-flex h-10 items-center gap-2 rounded-md px-4 text-label bg-primary text-primary-foreground`.
- **Android:**
  - `primary`: `Button(shape = MaterialTheme.shapes.medium)`.
  - `secondary`: `Button` con `ButtonDefaults.buttonColors(containerColor = colorScheme.secondary, contentColor = colorScheme.onSecondary)`.
  - `outline`: `OutlinedButton`. `ghost`: `TextButton`.
  - `destructive`: colores `error` / `onError`.
- **Do:** verbo en primera persona o imperativo corto: "Confirmo", "Me bajo", "Votar".
- **Don't:** "Aceptar"/"OK" genéricos; dos botones `primary` lado a lado.

### TextField

- **Cuándo:** registro, login, crear grupo, proponer cancha, notas y reseñas (multilínea).
- **Anatomía:**
  - label arriba (`text-label`), siempre visible, sin placeholder como label;
  - campo de 48 de alto, `text-body`, borde `input` y `radius.md`;
  - ayuda o error debajo en `text-caption`.
- **Estados:**
  - focus: borde `ring` de 2 px;
  - error: borde `destructive`, más ícono y texto de error debajo;
  - disabled: fondo `muted` y texto `muted-foreground`.
- **Android:** `OutlinedTextField(shape = MaterialTheme.shapes.medium)`, con `label` y `supportingText`.
- **Do:** errores concretos: "Tenés que tener 18 años o más para registrarte."
- **Don't:** "Campo inválido"; validar mientras se tipea el primer carácter (se valida al salir del campo).

### Select, Checkbox y Switch

- **Select:** para listas de 5 o más opciones (barrio). Para 2–4 opciones se usa segmented control (modalidad 5/7/8/11, superficie). En Android, `ExposedDropdownMenuBox` o `SingleChoiceSegmentedButtonRow`.
- **Checkbox:** selección múltiple en formularios (modalidades de una cancha).
- **Switch:** preferencias que aplican al instante (silenciar grupo, tipos de notificación, recibir calificaciones). Nunca en formularios que se "guardan".
- **Tokens:** `input` apagado; `primary` prendido; `ring` en el foco.

### Card y MatchCard

- **Card base:** fondo `surface`, borde `border`, `radius.lg`, padding `lg`, sin sombra en listas.
- **MatchCard** (el componente más importante de la app). Anatomía:
  1. Fila superior: fecha y hora en `text-h4` ("sáb 10/10 · 23:00"), con el badge de estado a la derecha.
  2. Cancha y modalidad en `text-body-sm muted-foreground` ("Cancha X · Fútbol 5").
  3. Cupo: barra fina (4 px, `muted` de fondo, `primary` de relleno; `success` al completarse) más "8/10" en `tabular-nums`. Si hay lista de espera: "+2 en espera" en `caption`.
  4. Acción: un botón. "Confirmo" (`primary`) si no confirmaste; "Me bajo" (`secondary`) si confirmaste; "Anotarme en espera" (`outline`) si está completo.
- **Estados de la card:** los define el badge; la card no cambia de color. Cancelado: contenido en `muted-foreground` más el motivo.
- **Android:** `Card(shape = MaterialTheme.shapes.large, colors = CardDefaults.cardColors(containerColor = colorScheme.surface), border = BorderStroke(1.dp, colorScheme.outlineVariant))`.
- **Don't:** meter en la card los equipos, el resultado y la votación a la vez. Solo lo que se decide en el momento; el resto va al detalle.

### Badge (estado)

- **Cuándo:** estados de la tabla *Estados del producto*. Siempre con texto.
- **Forma:** `radius.full`, 24 de alto, `text-caption`, padding horizontal `sm`, ícono opcional de 14 a la izquierda.
- **Variantes:** `success`, `warning`, `destructive`, `primary-container` (abierto), `secondary` (neutro).
- **Don't:** badges solo de color (puntito verde sin texto) para estados de partido o pago.

### Scoreboard (marcador)

- **Cuándo:** detalle de partido jugado y cabecera del historial.
- **Anatomía:** "Claros" y "Oscuros" con su chip de equipo, más el resultado central en `text-display font-display tabular-nums` ("5 – 3", con guion corto y espacios finos). Abajo, los goleadores en `text-body-sm`.
- **Ganador:** en `foreground`; perdedor en `muted-foreground`; empate, ambos en `foreground`. No se usa color de estado.
- **Tokens:** `team-*`, `text-display`, `font-display`.

### TeamChip y columnas de equipos

- **TeamChip:** cuadrado de 12 con `radius.sm` más el nombre del equipo. `team-light` lleva borde `border`; `team-dark` lleva borde `team-dark-border` (siempre).
- **Armado de equipos (admin):** dos columnas con encabezado TeamChip y contador "5/5". En móvil: tabs "Claros | Oscuros | Sin asignar". Cada jugador es una PlayerRow con acción de mover.
- Las vistas "Estadísticas" y "Capacidades" (RF-046, RF-128) son un segmented control arriba de las columnas.
- **Don't:** asignar colores de camiseta reales a los equipos (azul/rojo). La lectura claro/oscuro es el sistema.

### PlayerRow

- **Anatomía:**
  - avatar de 32 con la inicial (`muted` + `foreground`, `radius.full`);
  - nombre de usuario en `text-body-sm` 500;
  - dato secundario en `caption muted-foreground`: "confirmó 10:05", "PJ 12 · G 7";
  - a la derecha, badge o acción `sm`.
- **Alto mínimo:** 56. La fila entera es tocable si lleva al perfil.
- **Invitado sin cuenta:** el avatar lleva borde punteado `input` y el sufijo "(invitado)" en `muted-foreground`.
- **Jugador eliminado:** "Jugador eliminado" en `muted-foreground`, sin avatar ni acción.

### StatTable

- **Cuándo:** estadísticas del grupo y del perfil.
- **Anatomía:** encabezado `caption muted-foreground`; celdas `text-body-sm tabular-nums` alineadas a la derecha; nombre alineado a la izquierda.
- **Filas:** alto 44 y separador `border`. Tu propia fila lleva fondo `accent`.
- **Orden:** tocar un encabezado ordena, con indicador de flecha y `aria-sort`. Default: por partidos jugados.
- **Móvil:** la columna de nombre queda fija y el resto scrollea horizontalmente dentro de la tabla. La página nunca scrollea en horizontal (RNF-020).

### PollOption (votación)

- **Anatomía:**
  - checkbox (multi-voto, RF-021);
  - texto de la opción ("sáb 16:00" o nombre de cancha) con distancia en `caption` si hay permiso (RF-025);
  - barra de votos detrás del texto en `primary-container`, con el conteo "6" en `tabular-nums` a la derecha.
- **Opción votada por vos:** borde `primary` y check.
- **Cancha fuera del directorio:** badge neutro "Fuera del directorio".
- **Empate al cerrar:** alert `warning` para el admin: "Empate entre sáb y dom. Elegí uno."

### Monto

- `tabular-nums`, formato `$ 6.000`.
- Deuda: badge `warning` "Debe $ 11.000". Pagado: badge `success` "Pagó".
- El total del partido va en `text-h4`.
- Solo los admins ven el botón "Marcar pagado" (`outline sm`).
- **Orden en la fila:** nombre a la izquierda; el monto siempre contra el borde derecho; la acción "Marcar pagado" a la **izquierda** del monto. El monto está siempre y la acción aparece y desaparece según el estado y el rol. Si la acción fuera a la derecha, el monto saltaría de lugar en cada cambio.
- **Regla general** (aplica a PlayerRow, CourtCard y cualquier fila): el dato permanente ocupa el extremo y lo transitorio va hacia adentro, para que nada se desplace cuando cambia el estado.

### CourtCard y mapa (directorio)

- **CourtCard:**
  - nombre en `text-h4`;
  - zona, modalidades y superficie en `text-body-sm muted-foreground`;
  - distancia en `caption`;
  - puntaje "4,2 ★ (12)" en `text-body-sm tabular-nums`;
  - precio solo si es un complejo registrado (RN-24);
  - acciones "Llamar" y "WhatsApp" como `outline sm` con ícono.
- **Marcador de mapa:** pin con fondo `primary` y borde `surface` de 2 px. Seleccionado: más grande y con `shadow-md`. Las teselas OSM quedan sin estilizar en v0.1.
- **Mapa en oscuro:** se deja claro. Invertir teselas con filtros CSS rompe la legibilidad de los nombres de calles.

### Alert y Toast

- **Alert** (en página): ícono más texto, fondo del rol con su `-foreground`, `radius.md`. Para empate de votación, cupo incompleto a 2 h del partido y cuenta sin verificar.
- **Toast** (web) / **Snackbar** (Android): confirmaciones de una acción ("Te anotaste. Sos el 2° en espera."). Tienen fondo `foreground` y texto `background`, 4 s de duración y acción opcional "Deshacer". Van abajo, por encima de la barra de navegación.

### Dialog

- **Cuándo:** solo para confirmar algo destructivo o irreversible (pinchar partido, expulsar, borrar grupo, borrar cuenta) o para decisiones obligatorias (desempate).
- **Anatomía:** título `text-h3` con la pregunta concreta ("¿Pinchar el partido del sáb 10/10?"), consecuencia en `text-body` ("Les avisamos a los 8 confirmados."), campo de motivo si aplica, y botones `ghost` "Volver" + `destructive` "Pinchar partido".
- **Estilo:** `radius.xl`, `shadow-lg` y `overlay`.
- **Android:** `AlertDialog`.

### Tabs

- Subrayado de 2 px en `primary` para la tab activa; texto `text-label`, activo `foreground` e inactivo `muted-foreground`. Sin fondo.
- Uso dentro de un grupo: "Partidos | Stats | Miembros | Pagos". En Android, `PrimaryTabRow`.

### Navegación principal

- **Destinos (4):** Inicio (próximos partidos de todos tus grupos), Grupos, Canchas y Perfil. Las notificaciones van en un ícono de campana en la top app bar, con badge numérico.
- **Móvil (web y Android):** barra inferior de 64 de alto, ícono más label siempre visible y activo en `primary`. Android: `NavigationBar`.
- **Web ≥ 768 px:** barra lateral fija de 240 con los mismos destinos.

### Estado vacío

- Texto `text-body` con qué pasa y la acción concreta en un botón `primary`. Sin ilustración en v0.1.
- Ejemplos:
  - "Todavía no hay partidos. Creá una votación de horario." → [Crear votación]
  - "No hay canchas con esos filtros." → [Proponer una cancha] (RF-072)

## Accesibilidad

- **Contraste:** `contrast_check.py` pasa todos los pares obligatorios en claro y oscuro, más los extra de `contrastPairs`: `primary`, `input`, `ring`, `destructive` y `success` contra fondos, y `team-dark-border` y `team-light` vs `team-dark`. `border` es decorativo y no delimita controles.
- **Objetivos táctiles:** 48×48 dp en Android y 44×44 px mínimo en web (se usa 48). Los botones `sm` extienden el área con padding invisible.
- **Foco:** siempre visible, con anillo `ring` de 2 px y offset 2. Nunca `outline: none` sin reemplazo.
- **Color como único canal:** prohibido. Estados con texto, errores con ícono y texto, equipos con nombre además del chip.
- **Texto escalable:** `rem` en web y `sp` en Android. Hay que probar con fuente del sistema al 200%: las MatchCards crecen en alto, no recortan.
- **Tablas:** `<th scope>` y `aria-sort` en web; en Compose, `semantics { heading() }` en encabezados.
- **Mapa:** toda información del mapa también está en la vista de lista (RF-071).

## Contenido de interfaz

Tono: directo, voseo rioplatense, sin exclamaciones ni emojis en la interfaz.

| Situación | Sí | No |
|---|---|---|
| Confirmar | "Confirmo" | "¡Me sumo al partido! ⚽" |
| Baja | "Me bajo" → toast "Te bajaste. Avisamos a los admins." | "Lamentamos que no puedas asistir" |
| Error de red | "Sin conexión. Tu voto no se guardó; probá de nuevo." | "Ocurrió un error inesperado" |
| Lista de espera | "Se liberó un lugar. Tenés hasta las 12:00 para tomarlo." | "¡Tenés una oportunidad!" |

## Mantenimiento

- **Fuente de verdad:** `tokens.json`. Para cambiar un valor se edita el token y se corre `scripts/contrast_check.py tokens.json` (sin FAIL) y luego `scripts/export_tokens.py tokens.json --out build/`. Los archivos de `build/` no se editan a mano.
- **Exportador propio:** `scripts/export_tokens.py` es una copia extendida del de la skill. Los roles propios de `semantic` (como `team-*`) se exportan también a `ExtendedColors` en Compose.
- **Artifact:** `scripts/build_artifact.py <carpeta>` regenera los archivos del design system publicado a partir de `tokens.json` y de las secciones de componentes de este documento. Si se agrega un componente acá sin su preview, el script falla.
- **Versionado:** semver. Es versión mayor si se renombra o elimina un token, menor si se agrega un token o un componente, y patch si se ajusta un valor.
- **Componente nuevo:** antes de crearlo, verificar que no se resuelve componiendo los existentes. Si hace falta, se documenta acá con el mismo formato (cuándo, anatomía, estados, tokens, web/Android, do/don't) y se agrega al artifact.
