# Tarjeta de Casamiento — Esteban y Priscila

Invitación digital con RSVP familiar y panel administrativo. La aplicación conserva las migraciones de Supabase para una eventual vuelta, pero el cliente activo usa Google Apps Script como puente a una hoja de cálculo privada.

## Tecnologías

- React 18, Vite 5, TypeScript y Tailwind CSS 3.
- Google Apps Script y Google Sheets para persistencia (configuración manual pendiente).
- Google Identity Services para el acceso administrativo.
- reCAPTCHA v3 para validar los registros en el servidor.

## Desarrollo local

```powershell
npm install
Copy-Item .env.example .env.local
# Completar VITE_APPS_SCRIPT_URL, VITE_GOOGLE_OAUTH_CLIENT_ID y VITE_RECAPTCHA_SITE_KEY
npm run dev
```

Sin una implementación de Apps Script configurada, la interfaz no persiste registros y muestra el error del servicio; no simula un envío exitoso. No se conecta automáticamente a Supabase.

## Configuración de Apps Script

Los archivos de la implementación están en `apps-script/`. Para habilitarla manualmente:

1. Crear un proyecto de Apps Script y agregar `Code.gs`, `Bridge.html` y `appsscript.json`.
2. Crear una hoja de cálculo privada y configurar estas propiedades de secuencia de comandos: `SPREADSHEET_ID`, `APP_ORIGIN`, `GOOGLE_OAUTH_CLIENT_ID`, `RECAPTCHA_SECRET`, `RECAPTCHA_HOSTNAME` y un `RSVP_HASH_SECRET` aleatorio y privado.
3. Ejecutar `initializeWorkbook()` desde el editor de Apps Script. La función crea las pestañas faltantes y no limpia las que ya existen.
4. Configurar Google Identity Services para aceptar el origen de la aplicación y usar el mismo OAuth Client ID que se guarda en Apps Script.
5. Desplegar Apps Script como aplicación web ejecutada como su propietario. El puente debe estar disponible para visitantes; el acceso a la hoja queda del lado del propietario y las operaciones administrativas vuelven a verificar el token de Google y el rol en el servidor.
6. Completar las variables públicas de `.env.local` con la URL `/exec`, el Client ID público y la clave pública reCAPTCHA. Nunca colocar secretos de Apps Script en Vite.

La aplicación debe servirse desde el origen exacto de `APP_ORIGIN`. El registro requiere un reCAPTCHA v3 con acción `submit_rsvp`; si faltan secretos o propiedades obligatorias, el backend falla de forma cerrada. La autenticación y la persistencia reales solo se pueden comprobar después de configurar y desplegar manualmente estos servicios.

El backend de Sheets no implementa el editor de revisiones ni Storage privado. Esa pantalla se mantiene en el código Supabase, pero no se ofrece desde el panel activo. Las tarifas oficiales se mantienen fijas: bebé 0–1 años $0, niño 2–10 $50.000, adulto desde el comienzo $130.000 y adulto después del almuerzo $70.000. No hay tablas ni operaciones de pagos; los saldos son sumas de precios aplicados.

## Supabase conservado

Las migraciones y Edge Functions locales se preservan como alternativa futura. No forman parte del camino de ejecución de esta configuración de Apps Script y no se aplican automáticamente.

## Scripts

- `npm run dev` — servidor local en el puerto 3000.
- `npm run build` — build de producción.
- `npm run preview` — previsualizar build.
- `npm run lint` — chequeo TypeScript.
- `npm test` — pruebas de dominio y backend local simulado.
