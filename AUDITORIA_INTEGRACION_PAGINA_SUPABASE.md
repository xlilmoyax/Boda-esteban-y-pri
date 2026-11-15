# Auditoría de integración — página simplificada y arquitectura Supabase

**Proyecto:** Tarjeta de Casamiento — Esteban y Pri  
**Alcance:** inspección estática del repositorio local y contraste con `PROPUESTA_ARQUITECTURA_SUPABASE_TARJETA_CASAMIENTO.md`. No se inició la aplicación ni se hicieron solicitudes a Supabase durante esta auditoría.

## 1. Resumen ejecutivo

La simplificación visual conserva el formulario RSVP, sus campos de contacto y asistentes, la autenticación y las vistas administrativas. Sin embargo, la aplicación sigue conectada a un modelo heredado que no coincide con las migraciones nuevas. No es seguro aplicar las migraciones y esperar que la aplicación actual funcione sin una etapa de adaptación.

Hallazgos principales:

1. La consulta del incidente se inicia desde `HomeView` al leer directamente `invitation_revisions`. `App` mantiene ese componente montado aunque esté oculto en rutas distintas de `/`; además, Vite carga `.env.local` cuando ejecuta el proyecto.
2. El cliente público debe migrar de lecturas directas a `get_public_invitation()`. La tabla de revisiones no tiene acceso `anon`, mientras que la RPC sí está concedida para lectura pública.
3. RSVP llama a `registrar_confirmacion`, inexistente en las migraciones nuevas. La RPC disponible es `submit_public_rsvp`, requiere `request_id` y solo admite ejecución con `service_role`, por lo que corresponde invocarla desde una Edge Function con CAPTCHA y rate limiting.
4. El frontend administrativo usa `guests`, pagos y CRUD directo. La arquitectura aprobada usa `registrations`, saldos calculados, bajas lógicas y RPC; excluye por completo `payment_records`.
5. Tarifas, configuración y auditoría tienen diferencias de tablas, columnas, permisos y flujo transaccional.
6. El editor todavía invoca RPC de borrador/publicación ausentes y usa el bucket privado como si fuera público. La migración 005 declara expresamente que esas operaciones quedan para otra fase.
7. Se detectó un error de sintaxis probable en la migración local `007_seed.sql`: la misma columna `activated_at` aparece dos veces en un único `SET`.
8. La configuración inicial SQL solo fija la fecha y deshabilita la publicación bancaria; no carga horarios, lugar, fecha límite, vestimenta ni datos bancarios. La propuesta prohíbe almacenar CVU/CBU, pero el código actual contiene y muestra un campo CVU.

**Conclusión:** las migraciones y el frontend deben considerarse incompatibles hasta que se implemente y valide la integración. Esta auditoría no confirma funcionamiento de extremo a extremo ni ejecución válida de las migraciones.

## 2. Causa del incidente de consulta

- `src/lib/supabaseClient.ts:14-25` lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de `import.meta.env` e inicializa el cliente si ambas existen. Vite carga automáticamente los archivos de entorno locales, incluido `.env.local`; se verificó únicamente que el archivo existe, sin abrir ni informar su contenido.
- `src/App.tsx:53-66` inicia `auth.getSession()` y registra `auth.onAuthStateChange()` al montar la aplicación si el cliente está configurado.
- `src/App.tsx:104-106` conserva `HomeView` montado en todas las rutas; el atributo `hidden` solo lo oculta visualmente.
- `src/components/HomeView.tsx:47-79` hace tres lecturas al montarse: `getPublishedInvitation()`, `getEventSettings()` y `getPricingRules()`.
- La primera lectura se implementa en `src/lib/invitation-content.ts:40-54`: consulta directamente `invitation_revisions` para obtener la fila publicada. En el intento previo observado, esta fue la consulta que devolvió el error de tabla no disponible. No se repitió la conexión durante esta auditoría.
- No se encontró un modo aislado/offline documentado para ejecutar la aplicación con credenciales omitidas. Si el cliente no está configurado, el cliente muestra un aviso y Home usa valores predeterminados; no constituye una modalidad de integración simulada.
- Otras consultas automáticas al montar pantallas: `ConfirmacionView` carga precios (`src/components/ConfirmacionView.tsx:26-45`); `DashboardResume`, `GuestList`, `EventConfigView`, `AuditLogView` y el editor cargan datos cuando se muestran. La pantalla de acceso usa `auth.signInWithPassword()` al enviar el formulario (`src/components/AdminLoginView.tsx:16-28`).

## 3. Inventario de dependencias del frontend

| Superficie | Referencias actuales | Función |
|---|---|---|
| Inicio público | `invitation_revisions`, `event_settings`, `pricing_rules` | Carga contenido, datos del evento y precios desde `HomeView`. |
| RSVP | `pricing_rules`, RPC `registrar_confirmacion` | Muestra cálculo estimado y envía el grupo familiar, asistencia, contacto y asistentes. |
| Administración de invitados | `guests`, `attendees`, `payment_records`, `audit_logs` | Lista, consulta y modifica invitados; crea y elimina filas directamente. |
| Resumen administrativo | `guests`, `payment_records` | Cuenta grupos, asistentes y pagos verificados. |
| Configuración | `event_settings`, `pricing_rules`, `pricing_history`, `audit_logs` | Lee/actualiza ajustes y edita reglas de precio individualmente. |
| Auditoría | `audit_logs` | Inserta y lee logs con el formato heredado. |
| Autenticación | Supabase Auth | Recupera la sesión y permite iniciar sesión con email y contraseña. |
| Editor | `invitation_revisions`, `save_invitation_draft`, `publish_invitation_draft`, `storage.objects` | Historial, borradores, publicación, carga de imágenes y generación de URL pública. |

Referencias centrales: `src/lib/supabase.ts:32-121, 127-168, 175-221, 239-360, 381-429`; `src/lib/invitation-content.ts:40-123`; `src/lib/database.types.ts:1-66`.

## 4. Compatibilidad entre el frontend y el esquema nuevo

| Área | Esperado/llamado por el frontend | Definido en las migraciones locales | Resultado |
|---|---|---|---|
| Grupo familiar | `guests`: `name`, `surname`, `phone`, `email`, `attending`, sugerencia de canción, restricciones alimentarias y observaciones. | `registrations`: `contact_name`, `contact_surname`, `email`, `email_normalized`, `phone`, `rsvp_status`, `observations`, `request_id`, baja lógica y metadatos. | Tabla y columnas incompatibles. No existe alias o vista de compatibilidad. |
| Asistentes | `attendees.guest_id`; el tipo heredado admite `birth_date`, categoría y precio nullable; CRUD directo. | `attendees.registration_id`, edad obligatoria a la fecha del evento, categoría y precio/versionado aplicados, asistencia y baja lógica. FK con `ON DELETE RESTRICT`. | FK distinta; no se debe enviar `birth_date` ni precio desde el cliente. Las mutaciones previstas usan RPC. |
| Precios | Lee reglas activas con `.eq('active', true)`; tipos incluyen `label`, `description`, `min_age`, `max_age`, `active`, `updated_at`. Cambia una regla directamente y registra `pricing_history`. | `pricing_versions` y `pricing_rules` inmutables; la vigencia está en el estado de versión. Las reglas contienen categoría, precio, moneda y versión. No existe `pricing_history`. | Incompatible en campos y flujo. La publicación owner-only es `owner_publish_pricing_version`; el editor no debe modificar precios. |
| Pagos y saldos | `payment_records`, estados de pago, verificación/rechazo, importes verificados y resumen de pagos. | No existe `payment_records` por decisión expresa. El saldo se calcula desde asistentes activos y precios aplicados. | Funcionalidad heredada sin destino en la arquitectura aprobada; no migrar registros ficticios ni conservar esta pantalla como flujo de pagos. |
| Configuración del evento | `event_settings(key,value)`; incluye fecha, horarios, ubicación, dress code, alias, titular, CVU y banco. | `event_public_config` y `event_private_config`; lectura pública acotada mediante `get_public_invitation()`. No contiene CVU/CBU. Publicación de alias/titular/banco requiere aprobación owner. | Tabla, forma de consulta y lista de campos incompatibles. |
| Roles | La UI maneja una sesión Auth y pasa `currentAdminId`; no consulta `admin_profiles` antes de mostrar el panel. | `admin_profiles` vinculado a `auth.users`; `is_admin()` verifica `auth.uid()`, rol y estado activo. RLS/RPC limitan las acciones. | La autorización de base de datos está planteada, pero el frontend no resuelve el perfil/rol ni diferencia la interfaz. Una sesión Auth por sí sola no acredita rol administrativo. |
| Auditoría | Tipo UI: `admin_id`, `table_name`, `record_id`, `old_values`, `new_values`; las pantallas insertan directamente. | `actor_type`, `actor_id`, `action`, `entity_type`, `record_id` o `entity_key`, `request_id`, `source`, `old_data`, `new_data`; escrituras mediante operaciones confiables y transaccionales. | Columnas incompatibles. Inserciones directas del cliente están revocadas; la identidad del actor no debe declararse libremente desde el navegador. |
| Revisiones de invitación | Lectura directa de tabla pública; RPC `save_invitation_draft`/`publish_invitation_draft`; registro tipado con contenido JSON. | `invitation_revisions` tiene RLS, lectura solo para usuarios autenticados con rol admin; `005_invitation_editor.sql` no crea las RPC de escritura. La lectura pública prevista está dentro de `get_public_invitation()`. | La lectura pública actual será denegada con estas políticas; ambas RPC de edición están ausentes. |
| Storage | Bucket `invitation-assets`; carga desde cliente y `getPublicUrl()`. Ruta generada `invitation/photo-<uuid>.<ext>`. | Bucket privado, máximo 8 MiB y JPEG/PNG/WebP. `001_initial_schema.sql` valida rutas `invitation/<admin-uuid>/<asset-uuid>`; `006_storage_bucket.sql` no crea políticas ni RPC de carga/URL firmada. | Ruta incompatible; faltan permisos de Storage y firma. Una URL pública no sirve para un objeto del bucket privado. |

### 4.1 RSVP, campos y protecciones

- La inspección estática de `src/components/ConfirmacionView.tsx:14-18, 26-45, 50-91, 132-158` confirma campos de nombre, apellido, teléfono, email, asistencia, sugerencia de canción, restricciones/detalle alimentario, observaciones vacías generadas por el cliente y asistentes con nombre, apellido, `age_at_event` y `after_lunch`.
- La vista valida nombre, apellido, email, asistencia y edad entera de 0 a 120 antes de enviar. Mantiene una sugerencia de canción; quitar el reproductor musical no quitó ese campo del formulario.
- El cálculo visual usa `calculateGroupTotal()` y reglas descargadas del cliente (`src/domain/pricing.ts:27-83`). Las migraciones nuevas sí determinan la categoría y el importe del lado de la base (`004_pricing_history.sql:3-35, 550-603`); ese diseño no está conectado al envío actual.
- `src/lib/supabase.ts:420-430` invoca `registrar_confirmacion` y envía campos `p_guest_*` más asistentes. Ninguna migración local define esa RPC. La nueva `submit_public_rsvp` recibe `p_request_id`, contacto, asistencia, asistentes y observaciones; no acepta sugerencia de canción ni restricciones alimentarias (`004_pricing_history.sql:372-440`).
- `submit_public_rsvp` está revocada a `anon` y `authenticated`, y concedida a `service_role`. El formulario no genera ni envía `request_id` y el repositorio no contiene una Edge Function que valide CAPTCHA, aplique rate limit e invoque esa RPC.
- No se hallaron campos para canción o restricciones alimentarias en `registrations` ni argumentos correspondientes en `submit_public_rsvp`. Se requiere decidir si esos datos se incorporan al modelo/operación aprobado o si se retiran del RSVP antes de conectar el formulario.
- La arquitectura evita confiar en valores de precio del navegador. La llamada actual tampoco envía explícitamente un precio al RPC, pero el destino heredado no existe y el nuevo flujo no es llamado.

### 4.2 Datos públicos y transferencia

- `HomeView` consume `event_settings` y `pricing_rules` y renderiza horarios, dirección, precios y datos de transferencia. La nueva RPC `get_public_invitation()` devuelve un objeto estructurado con evento, tarifas, publicación y datos bancarios solo si están habilitados (`003_functions.sql:259-300`); Home no la llama ni adapta su respuesta.
- `event-config.ts` contiene valores predeterminados de evento y un CVU; la página también renderiza explícitamente ese campo (`HomeView.tsx:280-286`). No se reproduce el valor aquí. Esto contradice la decisión aprobada de no almacenar ni publicar CVU/CBU (`PROPUESTA_ARQUITECTURA_SUPABASE_TARJETA_CASAMIENTO.md:71-79`).
- `007_seed.sql` establece fecha 2027-09-26 y `bank_details_published = false`, pero deja sin inicializar horarios, lugar, fecha límite, dress code y datos bancarios. Los defaults locales no sustituyen la persistencia ni la respuesta acotada de la RPC.

### 4.3 Panel administrativo y matriz owner/editor

- El dashboard ofrece pestañas de invitados, pagos, configuración, auditoría y editor (`AdminDashboardView.tsx:18-25, 30-36`). Las vistas usan servicios heredados y no invocan las RPC nuevas de alta/edición, bajas/restaurables, saldos ni configuración.
- `App.tsx:53-66, 75-84` deriva el acceso visual de la existencia de una sesión y un id de usuario; no carga el rol de `admin_profiles`. `AdminDashboardView` no recibe un rol y no muestra controles diferenciados owner/editor.
- La capa SQL define `is_admin()` con owner/editor y lectura RLS; las mutaciones nuevas se ofrecen por RPC autenticadas y las acciones sensibles requieren owner (`002_rls_policies.sql:3-23, 61-89`; `003_functions.sql:86-144, 146-226`; `004_pricing_history.sql:94-170`). Estas reglas estáticas no prueban una autorización integrada porque la UI sigue llamando endpoints anteriores.
- La pantalla de configuración permite editar precios y campos de transferencia sin rol diferenciado (`EventConfigView.tsx:29-47, 105-123`); la arquitectura asigna tarifas, roles, configuración privada y publicación de datos bancarios exclusivamente al owner.
- La vista de detalle crea, actualiza y elimina asistentes; no ofrece restauración. El SQL nuevo requiere baja lógica/restauración mediante RPC y preservación de tarifas históricas (`GuestDetail.tsx:52-103`).

## 5. Elementos SQL locales y observaciones de preparación

Migraciones encontradas: `001_initial_schema.sql` a `007_seed.sql`.

- `001`–`004` aparecen modificadas en el worktree respecto del commit inicial; `005`–`007` aparecen como archivos sin seguimiento. Ese estado antecede a esta auditoría y se preservó.
- `001` crea perfiles, configuración pública/privada, versiones y reglas de precios, registros familiares, asistentes, resultados/idempotencia RSVP, rate limits, auditoría y revisiones.
- `002` crea la función de verificación de rol, RLS y grants de lectura mínimos.
- `003` implementa bootstrap manual owner, administración de roles/configuración y `get_public_invitation()`.
- `004` implementa cálculo y versionado tarifario, operaciones administrativas de registros/asistentes, saldo, RSVP y rate limiting.
- `005` configura solo lectura administrativa de revisiones; declara que las RPC de borrador/publicación quedan para después.
- `006` crea/configura el bucket privado; declara que no crea políticas ni operaciones de upload/URL firmada.
- `007` carga configuración mínima y precios oficiales iniciales, sin crear usuarios ni perfiles Auth.

**Bloqueo de sintaxis detectado:** en `supabase/migrations/007_seed.sql`, la actualización de la versión inicial asigna `activated_at = now()` dos veces en el mismo `SET` (línea 32). La migración debe corregirse y probarse localmente antes de pretender ejecutarla. No se modificó.

**Brecha entre propuesta y migraciones presentes:** la arquitectura describe Edge Functions para CAPTCHA, rate limiting, RSVP y recursos firmados del editor, además de RPC de revisión/publicación/restauración. No se encontraron esas funciones en el repositorio local; las migraciones incluso indican que parte de ellas está pendiente.

## 6. Problemas que deben resolverse antes de aplicar o conectar

1. Corregir y validar localmente el `UPDATE` duplicado de `activated_at` en `007_seed.sql`.
2. Acordar el destino de sugerencia de canción, restricciones alimentarias y cualquier otro campo del formulario que no figura en el nuevo modelo.
3. Migrar servicios y tipos del modelo `guests` a `registrations`, adaptar `guest_id` a `registration_id` y reemplazar DML directo por RPC autorizadas.
4. Sustituir `getEventSettings()`/`getPricingRules()` y la lectura directa de revisiones por `get_public_invitation()` con validación/adaptación de su respuesta.
5. Implementar la Edge Function RSVP: CAPTCHA validado en servidor, rate limit, request idempotente, metadatos confiables y llamada server-side a `submit_public_rsvp`; no exponer `service_role`.
6. Rediseñar resumen y panel de pagos para saldos calculados, o retirar los flujos heredados de pagos, sin crear `payment_records`.
7. Adaptar configuración, precios y auditoría a sus RPC/columnas nuevas, y cargar `admin_profiles` para presentar el estado/rol. La seguridad efectiva debe continuar en RLS/RPC, no depender de ocultar controles.
8. Completar el editor con RPC de borrador/publicación/restauración, rutas aceptadas, políticas y firma temporal de objetos; eliminar el uso de URLs públicas para el bucket privado.
9. Definir los valores públicos iniciales aprobados (fecha, horarios, lugar, fecha límite, vestimenta y datos bancarios permitidos). No trasladar CVU/CBU.
10. Ejecutar pruebas de migración, funciones y RLS en un entorno local desechable y autorizado, y pruebas de integración del frontend. Las pruebas TypeScript que simulan reglas no equivalen a ejecución de PostgreSQL, RLS o Supabase.

## 7. Verificaciones y límites

- Se contrastaron estáticamente el RSVP, sus validaciones y campos, la llamada de envío, navegación a `/confirmacion`, autenticación, vistas administrativas, servicios, tipos, esquema SQL, políticas, RPC y Storage.
- Las pruebas estáticas de roles en `src/domain/admin.security.test.ts` simulan `is_admin()` en TypeScript; no prueban RLS ni roles en PostgreSQL.
- No se ejecutaron pruebas, lint, build ni acceso con cuentas reales durante esta auditoría. Por lo tanto, no se afirma que el RSVP, el login, el panel o las migraciones funcionen realmente.
- No se inició la aplicación, no se consultó Supabase remoto, no se creó ni modificó ningún usuario remoto, Storage, datos o proyecto.
- No se modificó código ni ningún archivo SQL. El único archivo creado por esta auditoría es este informe. No se hicieron commit, push ni deploy.
