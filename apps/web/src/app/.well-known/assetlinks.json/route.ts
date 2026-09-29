// Digital Asset Links para los App Links de Android (RF-011): el link de invitación
// (<origen>/i/<token>) abre la app si está instalada. Se lee del entorno al servir, así cada
// ambiente declara sus huellas:
// - ANDROID_PAQUETE: applicationId de la app (por defecto com.canchitas.app).
// - ANDROID_HUELLAS_SHA256: huellas SHA-256 de los certificados de firma, separadas por coma.
//   En staging y prod, la de la firma de release o la de Play App Signing; nunca la de debug,
//   porque el keystore de debug está en el repo y cualquiera podría firmar con él.
// Con `next dev` y sin la variable, se usa la del keystore de debug del repo
// (apps/android/app/debug.keystore). Sin huellas se sirve una lista vacía.
export const dynamic = 'force-dynamic';

const huella = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

const huellaDeDebug =
  '48:1A:F3:55:A8:05:07:88:58:3C:F2:D4:3C:E4:00:44:0B:4E:E5:E2:0E:ED:24:B0:20:A7:17:98:47:B1:38:0E';

function huellasDelEntorno(): string {
  const configuradas = process.env['ANDROID_HUELLAS_SHA256'];
  if (configuradas !== undefined) {
    return configuradas;
  }
  return process.env.NODE_ENV === 'development' ? huellaDeDebug : '';
}

export function GET(): Response {
  const paquete = process.env['ANDROID_PAQUETE'] ?? 'com.canchitas.app';
  const huellas = huellasDelEntorno()
    .split(',')
    .map((h) => h.trim().toUpperCase())
    .filter((h) => huella.test(h));

  const declaraciones =
    huellas.length === 0
      ? []
      : [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: paquete,
              sha256_cert_fingerprints: huellas,
            },
          },
        ];

  return Response.json(declaraciones, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
