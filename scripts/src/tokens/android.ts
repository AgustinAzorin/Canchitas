// tokens.json → tema de Compose para core:designsystem (ADR 0011, ADR 0017).
// Los roles que Material 3 no tiene van en ExtendedColors.
import { colorDeRol, type EstiloDeTexto, type Tema, type Tokens } from './leer.ts';

const encabezado =
  'Generado por scripts/src/tokens desde docs/design-system/tokens.json. No editar.';

const camel = (texto: string): string =>
  texto.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const snake = (texto: string): string => texto.toLowerCase().replaceAll(' ', '_');

/** #RRGGBB o #RRGGBBAA → Color(0xAARRGGBB). */
function colorKotlin(hex: string): string {
  const rgb = hex.slice(1, 7);
  const alfa = hex.length === 9 ? hex.slice(7, 9) : 'FF';
  return `Color(0x${alfa}${rgb})`;
}

/** Rol de Material 3 → rol semántico. Se definen todos para que no se cuele el violeta de base. */
const esquemaM3: Record<string, string> = {
  primary: 'primary',
  onPrimary: 'primary-foreground',
  primaryContainer: 'primary-container',
  onPrimaryContainer: 'primary-container-foreground',
  inversePrimary: 'primary-container',
  secondary: 'secondary',
  onSecondary: 'secondary-foreground',
  secondaryContainer: 'secondary',
  onSecondaryContainer: 'secondary-foreground',
  tertiary: 'info',
  onTertiary: 'info-foreground',
  tertiaryContainer: 'accent',
  onTertiaryContainer: 'accent-foreground',
  background: 'background',
  onBackground: 'foreground',
  surface: 'surface',
  onSurface: 'surface-foreground',
  surfaceVariant: 'muted',
  onSurfaceVariant: 'muted-foreground',
  surfaceTint: 'surface',
  inverseSurface: 'foreground',
  inverseOnSurface: 'background',
  error: 'destructive',
  onError: 'destructive-foreground',
  errorContainer: 'destructive',
  onErrorContainer: 'destructive-foreground',
  outline: 'input',
  outlineVariant: 'border',
  scrim: 'overlay',
  surfaceBright: 'surface',
  surfaceDim: 'muted',
  surfaceContainer: 'surface',
  surfaceContainerHigh: 'surface',
  surfaceContainerHighest: 'surface',
  surfaceContainerLow: 'surface',
  surfaceContainerLowest: 'surface',
};

const extendidos = [
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'accent',
  'accent-foreground',
  'ring',
  'team-light',
  'team-light-foreground',
  'team-dark',
  'team-dark-foreground',
  'team-dark-border',
];

/** Estilo de la escala → estilo de Material 3 (GUIDELINES, tabla de tipografía). */
const tipografiaM3: Record<string, string> = {
  displayLarge: 'display',
  displayMedium: 'display',
  displaySmall: 'display',
  headlineLarge: 'h1',
  headlineMedium: 'h2',
  headlineSmall: 'h3',
  titleLarge: 'h3',
  titleMedium: 'h4',
  titleSmall: 'label',
  bodyLarge: 'body-lg',
  bodyMedium: 'body',
  bodySmall: 'body-sm',
  labelLarge: 'label',
  labelMedium: 'caption',
  labelSmall: 'caption',
};

const nombreDePeso: Record<number, string> = {
  400: 'regular',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
};

function archivo(paquete: string, imports: string[], cuerpo: string[]): string {
  return [
    `// ${encabezado}`,
    `package ${paquete}`,
    '',
    ...imports.map((i) => `import ${i}`),
    '',
    ...cuerpo,
    '',
  ].join('\n');
}

export function recursoDeFuente(familia: string, peso: number): string {
  return `${snake(familia)}_${nombreDePeso[peso] ?? String(peso)}`;
}

export function colorKt(tokens: Tokens): string {
  const paquete = tokens.meta.android.package;
  const esquema = (tema: Tema): string[] =>
    Object.entries(esquemaM3).map(
      ([m3, rol]) => `    ${m3} = ${colorKotlin(colorDeRol(tokens, tema, rol))},`,
    );
  const extendido = (tema: Tema): string[] =>
    extendidos.map((rol) => `    ${camel(rol)} = ${colorKotlin(colorDeRol(tokens, tema, rol))},`);
  return archivo(
    paquete,
    [
      'androidx.compose.material3.darkColorScheme',
      'androidx.compose.material3.lightColorScheme',
      'androidx.compose.runtime.Immutable',
      'androidx.compose.ui.graphics.Color',
    ],
    [
      '/** Roles de tokens.json que Material 3 no tiene. Se leen con CanchitasTheme.extendedColors. */',
      '@Immutable',
      'data class ExtendedColors(',
      ...extendidos.map((rol) => `    val ${camel(rol)}: Color,`),
      ')',
      '',
      'internal val LightColorScheme = lightColorScheme(',
      ...esquema('light'),
      ')',
      '',
      'internal val DarkColorScheme = darkColorScheme(',
      ...esquema('dark'),
      ')',
      '',
      'internal val LightExtendedColors = ExtendedColors(',
      ...extendido('light'),
      ')',
      '',
      'internal val DarkExtendedColors = ExtendedColors(',
      ...extendido('dark'),
      ')',
    ],
  );
}

export function typeKt(tokens: Tokens): string {
  const { fonts, scale } = tokens.typography;
  const familia = (nombre: string, f: { family: string; weights: number[] }): string[] => [
    `internal val ${nombre} = FontFamily(`,
    ...f.weights.map(
      (p) => `    Font(R.font.${recursoDeFuente(f.family, p)}, FontWeight.W${String(p)}),`,
    ),
    ')',
  ];
  const estilo = (m3: string, e: EstiloDeTexto): string[] => [
    `    ${m3} = TextStyle(`,
    `        fontFamily = ${e.font === 'display' ? 'DisplayFontFamily' : 'SansFontFamily'},`,
    `        fontWeight = FontWeight.W${String(e.weight)},`,
    `        fontSize = ${String(e.size)}.sp,`,
    `        lineHeight = ${String(e.lineHeight)}.sp,`,
    `        letterSpacing = ${String(e.tracking ?? 0)}.em,`,
    '    ),',
  ];
  return archivo(
    tokens.meta.android.package,
    [
      'androidx.compose.material3.Typography',
      'androidx.compose.ui.text.TextStyle',
      'androidx.compose.ui.text.font.Font',
      'androidx.compose.ui.text.font.FontFamily',
      'androidx.compose.ui.text.font.FontWeight',
      'androidx.compose.ui.unit.em',
      'androidx.compose.ui.unit.sp',
      `${tokens.meta.android.rPackage}.R`,
    ],
    [
      ...familia('SansFontFamily', fonts.sans),
      '',
      ...familia('DisplayFontFamily', fonts.display),
      '',
      'internal val CanchitasTypography = Typography(',
      ...Object.entries(tipografiaM3).flatMap(([m3, nombre]) => {
        const e = scale[nombre];
        if (e === undefined) {
          throw new Error(`tokens.json: falta el estilo ${nombre}`);
        }
        return estilo(m3, e);
      }),
      ')',
    ],
  );
}

export function shapeKt(tokens: Tokens): string {
  const r = (nombre: string): string =>
    `RoundedCornerShape(${String(tokens.radius[nombre] ?? 0)}.dp)`;
  return archivo(
    tokens.meta.android.package,
    [
      'androidx.compose.foundation.shape.RoundedCornerShape',
      'androidx.compose.material3.Shapes',
      'androidx.compose.ui.unit.dp',
    ],
    [
      '/** Botones, campos y chips usan `medium`; cards, `large`; diálogos, `extraLarge` (GUIDELINES). */',
      'internal val CanchitasShapes = Shapes(',
      `    extraSmall = ${r('sm')},`,
      `    small = ${r('md')},`,
      `    medium = ${r('md')},`,
      `    large = ${r('lg')},`,
      `    extraLarge = ${r('xl')},`,
      ')',
    ],
  );
}

export function dimensionesKt(tokens: Tokens): string {
  const nombreKotlin = (nombre: string): string =>
    nombre.replace(/^(\d)xl$/, (_, n: string) => 'x'.repeat(Number(n)) + 'l');
  const [x1, y1, x2, y2] = [0, 1, 2, 3];
  return archivo(
    tokens.meta.android.package,
    ['androidx.compose.animation.core.CubicBezierEasing', 'androidx.compose.ui.unit.dp'],
    [
      'object Spacing {',
      ...Object.entries(tokens.spacing.scale).map(
        ([n, v]) => `    val ${nombreKotlin(n)} = ${String(v)}.dp`,
      ),
      '}',
      '',
      'object Elevation {',
      ...Object.entries(tokens.elevation).map(([n, { dp }]) => `    val ${n} = ${String(dp)}.dp`),
      '}',
      '',
      'object Motion {',
      ...Object.entries(tokens.motion.duration).map(
        ([n, ms]) => `    const val DURATION_${n.toUpperCase()}: Int = ${String(ms)}`,
      ),
      ...Object.entries(tokens.motion.easing).map(
        ([n, c]) =>
          `    val ${n} = CubicBezierEasing(${[c[x1], c[y1], c[x2], c[y2]].map((v) => `${String(v)}f`).join(', ')})`,
      ),
      '}',
    ],
  );
}

export function themeKt(tokens: Tokens): string {
  return archivo(
    tokens.meta.android.package,
    [
      'androidx.compose.foundation.isSystemInDarkTheme',
      'androidx.compose.material3.MaterialTheme',
      'androidx.compose.runtime.Composable',
      'androidx.compose.runtime.CompositionLocalProvider',
      'androidx.compose.runtime.ReadOnlyComposable',
      'androidx.compose.runtime.staticCompositionLocalOf',
    ],
    [
      'val LocalExtendedColors = staticCompositionLocalOf { LightExtendedColors }',
      '',
      '/** Tema de Canchitas. Sigue el modo del sistema; sin dynamic color, que pisa la marca. */',
      '@Composable',
      'fun CanchitasTheme(',
      '    darkTheme: Boolean = isSystemInDarkTheme(),',
      '    content: @Composable () -> Unit,',
      ') {',
      '    CompositionLocalProvider(',
      '        LocalExtendedColors provides if (darkTheme) DarkExtendedColors else LightExtendedColors,',
      '    ) {',
      '        MaterialTheme(',
      '            colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,',
      '            typography = CanchitasTypography,',
      '            shapes = CanchitasShapes,',
      '            content = content,',
      '        )',
      '    }',
      '}',
      '',
      'object CanchitasTheme {',
      '    val extendedColors: ExtendedColors',
      '        @Composable',
      '        @ReadOnlyComposable',
      '        get() = LocalExtendedColors.current',
      '}',
    ],
  );
}
