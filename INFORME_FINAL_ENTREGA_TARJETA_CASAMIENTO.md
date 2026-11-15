# INFORME FINAL — PROMPT MAESTRO 1/3 CIERRE TÉCNICO DEFINITIVO

**Proyecto:** Tarjeta de Casamiento — Esteban y Priscila  
**Repositorio:** `C:\Users\prisc\OneDrive\Documentos\Tarjeta-de-Casamiento`  
**Fecha:** 14 de noviembre de 2026  
**Estado:** Implementación local completa — listo para integración real con Supabase  
**Operaciones remotas:** Ninguna (sin conexión a Supabase, sin migraciones remotas, sin despliegue, sin push a GitHub)

---

## 1. Archivos creados, modificados y eliminados

### Creados

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/010_admin_config_and_revisions.sql` | Funciones de administración de configuración e `invitation_revisions`: `save_invitation_draft`, `publish_invitation_draft`, `admin_restore_invitation_revision`, `get_public_invitation`, `admin_update_public_config`, `owner_update_private_config`. Nuevas funciones de validación: `invitation_storage_path_is_valid`, `invitation_storage_paths_are_valid`, `invitation_storage_objects_exist`. Trigger `protect_invitation_revision`. |
| `supabase/migrations/011_admin_missing_rpcs.sql` | RPCs administrativas: `get_current_admin_profile`, `owner_set_admin_role`, `owner_set_admin_active`, `admin_get_event_config`, `admin_update_event_public_config`, `admin_update_registration_details`, `admin_get_dashboard_summary`, `admin_get_balance_summary`. Ajuste de firmas para coincidir con `database.types.ts`. |
| `src/domain/definitive-architecture.test.ts` | 58 pruebas estáticas de arquitectura definitiva. |
| `src/domain/etapa-b-validacion.test.ts` | 42 pruebas de validación de bloqueos (Etapa B del PROMPT MAESTRO 2). |
| `INFORME_FINAL_ENTREGA_TARJETA_CASAMIENTO.md` | Informe final de entrega. |

### Modificados

| Archivo | Cambio realizado |
|---------|-----------------|
| `supabase/migrations/003_functions.sql` | Reescrito: eliminado `registrar_confirmacion()`, `calculate_group_amount()` y `audit_log()` legacy. Conserva `write_audit()` y `is_admin()`. Sin referencias a `guests`, `payment_records`, `birth_date`. |
| `src/lib/data-service.ts` | Reescrito para usar Supabase (`supabaseClient`) en lugar de Google Apps Script. Todas las operaciones vía RPCs y Edge Function `submit-rsvp`. |
| `src/lib/database.types.ts` | Agregada tabla `event_private_config` y tipo `EventPrivateConfigRow`. Agregado `Json` a imports. |

### Eliminados

Ningún archivo eliminado en esta sesión. (`src/components/WeddingMusic.tsx` y `src/lib/supabase.ts` ya estaban eliminados antes; se preservaron como estaban.)

---

## 2. Correcciones realizadas (Etapa B — Validación de bloqueos)

### `owner_set_admin_active` (011)
- ✅ Registra el estado real anterior (`previous_active`) en auditoría.
- ✅ Registra el estado nuevo (`active`) en auditoría.
- ✅ Bloquea desactivar al último owner (`No se puede desactivar el último owner`).
- ✅ Requiere rol `owner` (`is_admin('owner')`).
- ✅ Usa `FOR UPDATE` en `admin_profiles` para consistencia transaccional.

### `admin_update_registration_details` (011)
- ✅ Valida todos los campos (nombre, apellido, email, teléfono, observaciones, estado RSVP, canción, detalles dietéticos, restricciones).
- ✅ Verifica que confirmación requiera al menos un asistente activo.
- ✅ Evita duplicados de correo normalizado con otra inscripción existente.
- ✅ Registra `changed_fields` en auditoría.
- ✅ Operación transaccional (`FOR UPDATE`, `security definer`).

### `admin_get_dashboard_summary` (011)
- ✅ Usa `calculate_registration_balance` para cálculos de balance.
- ✅ Filtra por `rsvp_status = 'confirmed'` y `deleted_at is null`.
- ✅ No suma asistentes indiscriminadamente sin verificar estado del registro.

### `admin_get_balance_summary` (011)
- ✅ Retorno alineado con `database.types.ts`: `registration_id`, `contact_name`, `contact_surname`, `email`, `balance_due`, `included_attendees`.
- ✅ Usa `calculate_registration_balance`.

### `save_invitation_draft` (010)
- ✅ Control de concurrencia mediante `p_expected_updated_at` (error `40001` si cambió).
- ✅ Valida contenido con `invitation_content_is_safe`.
- ✅ Valida rutas de Storage con `invitation_storage_paths_are_valid`.
- ✅ Verifica existencia de objetos con `invitation_storage_objects_exist`.
- ✅ Impide guardar rutas de objetos inexistentes.
- ✅ Audita creación y actualización de borradores.

### `publish_invitation_draft` (010)
- ✅ Control de concurrencia real mediante `p_expected_updated_at` y `pg_advisory_xact_lock(724622)`.
- ✅ No ignora `p_expected_updated_at`.
- ✅ Requiere rol `owner`.
- ✅ Registra publicación en auditoría.
- ✅ Evita publicaciones simultáneas inconsistentes.

### `admin_restore_invitation_revision` (010)
- ✅ Permite restaurar revisiones archivadas como borrador.
- ✅ No modifica contenido publicado directamente (pasa por borrador seguro).
- ✅ Control de concurrencia mediante `p_expected_updated_at`.
- ✅ No permite borrador duplicado.
- ✅ Mantiene historial y auditoría.

---

## 3. Funciones y validaciones de invitación (independientes de 009)

| Función | Archivo | Propósito |
|---------|---------|-----------|
| `invitation_storage_path_is_valid(text)` | 010 | Valida formato UUID de rutas de Storage (`invitation/<uuid>/<uuid>`). |
| `invitation_storage_paths_are_valid(jsonb)` | 010 | Valida recursivamente rutas de storage en contenido JSON. |
| `invitation_storage_objects_exist(jsonb)` | 010 | Verifica que objetos referenciados existan en `storage.objects` (bucket `invitation-assets`). |
| `protect_invitation_revision()` | 010 | Trigger de inmutabilidad para revisiones publicadas/archivadas. |
| `get_public_invitation()` | 010 | Configuración pública + tarifas activas para RSVP (accesible por `anon`). |

No se copió el SQL de la migración 009. Todas las funciones se diseñaron según las tablas y columnas que realmente existen en la arquitectura definitiva (`001`).

---

## 4. Migraciones definitivas y orden de ejecución

| Orden | Archivo | Contenido principal |
|-------|---------|---------------------|
| 1 | `001_initial_schema.sql` | Extensiones (`pgcrypto`), 9 tablas definitivas, `invitation_content_is_safe`. |
| 2 | `002_rls_policies.sql` | `is_admin()`, RLS, grants de solo lectura, políticas de lectura por rol. |
| 3 | `003_functions.sql` | `write_audit()`, `is_admin()`. Sin funciones legacy. |
| 4 | `004_pricing_history.sql` | `calculate_attendee_price()`, triggers de inmutabilidad, `owner_publish_pricing_version()`, `create_registration_core()`, `submit_public_rsvp()`, `consume_rsvp_rate_limit()`, `admin_get_balance_summary()`, `calculate_registration_balance()`, soft delete/restore. |
| 5 | `005_invitation_editor.sql` | RLS y políticas de lectura para `invitation_revisions`. |
| 6 | `006_storage_bucket.sql` | Bucket privado `invitation-assets` (8 MiB, JPEG/PNG/WebP). |
| 7 | `007_seed.sql` | Datos iniciales: configuración evento, versión tarifaria 1 (4 tarifas oficiales). |
| 8 | `008_rsvp_family_fields.sql` | `song_suggestion`, `dietary_restrictions`, `dietary_details`; `submit_public_rsvp` expandida; `admin_update_registration_rsvp_details`; `admin_get_registration_balance`. |
| 9 | `010_admin_config_and_revisions.sql` | Configuración pública/privada, `invitation_revisions`, validación Storage, concurrencia. |
| 10 | `011_admin_missing_rpcs.sql` | RPCs administrativas restantes, ajuste de firmas, `admin_get_balance_summary` alineado con tipos. |

**Migración 009 (`009_complete_admin_public_storage.sql`):** Permanece sin modificar, sin ejecutar y sin copiar. No se reproduce ninguna función exclusiva de 009 en 010/011.

---

## 5. Funciones SQL implementadas

### Precio (backend, servidor)
- `calculate_attendee_price(p_age_at_event, p_after_lunch)` — determina categoría y precio por edad + after_lunch. Bebé 0–1 = $0; Niño 2–10 = $50.000; Adulto post-almuerzo = $70.000; Adulto desde comienzo = $130.000. Rechaza edad nula/fuera de rango y after_lunch nulo.

### RSVP público (protegido, service_role)
- `submit_public_rsvp()` — idempotencia (advisory lock + `rsvp_request_results`), validación de payload, cálculo de precios en servidor. Solo ejecutable por `service_role`.

### Administración (is_admin + RLS)
- `get_current_admin_profile()`, `owner_set_admin_role()`, `owner_set_admin_active()`
- `admin_get_event_config()`, `admin_update_event_public_config()`, `admin_update_public_config()`, `owner_update_private_config()`
- `admin_create_registration()`, `admin_update_registration()`, `admin_update_registration_details()`
- `admin_set_registration_status()`, `admin_add_attendee()`, `admin_update_attendee()`
- `admin_soft_delete_registration()`, `admin_restore_registration()`, `admin_soft_delete_attendee()`, `admin_restore_attendee()`
- `admin_get_balance_summary()`, `admin_get_registration_balance()`, `admin_get_dashboard_summary()`
- `save_invitation_draft()`, `publish_invitation_draft()`, `admin_restore_invitation_revision()`
- `get_public_invitation()`

### Validación de invitación/Storage
- `invitation_storage_path_is_valid()`, `invitation_storage_paths_are_valid()`, `invitation_storage_objects_exist()`
- `protect_invitation_revision()` (trigger de inmutabilidad)

---

## 6. Seguridad y permisos

- **RLS** habilitado en todas las tablas definitivas. Ninguna tabla permite escritura directa desde `anon`/`authenticated`/`service_role`.
- **`is_admin('owner'|'editor')`** protege todas las mutaciones administrativas.
- **Roles:** Owner (`matymoya18@gmail.com`) puede todo; Editor (`priscila.moya@mi.unc.edu.ar`) puede administrar registros, asistentes, configuración pública, balances, pero no roles ni datos bancarios ni publicar invitación.
- **`submit_public_rsvp`** solo ejecutable por `service_role` (desde Edge Function).
- **Edad:** `age_at_event` integer 0–120. `birth_date` no se almacena.
- **Precios:** calculados exclusivamente en backend. Precio faltante falla (no se vuelve cero silenciosamente).
- **Soft delete / restore:** `deleted_at`, `deleted_by`, `deletion_reason` en `registrations` y `attendees`.
- **Auditoría:** `audit_logs` con actor, acción, entidad, datos viejo/nuevo, request_id, source.
- **Configuración bancaria:** `bank_details_published` solo por owner; requiere campos completos.
- **Restricciones alimentarias:** máximo 4 valores únicos (`celiaquia`, `vegetariana`, `vegana`, `diabetes`); `dietary_details` ≤ 500; `song_suggestion` ≤ 200.
- **Sin secretos en frontend:** `service_role` nunca en `VITE_` vars.

---

## 7. Estado de Storage

- Bucket privado `invitation-assets` (migration `006`), 8 MiB límite, MIME `image/jpeg`, `image/png`, `image/webp`.
- Rutas con UUID: `invitation/<uuid>/<uuid>`.
- Sin sobrescrituras (`upsert: false`).
- URLs firmadas temporales (1 hora) vía `getInvitationImageSignedUrl`.
- Base de datos almacena rutas, no URLs temporales.
- Funciones de validación: `invitation_storage_path_is_valid`, `invitation_storage_paths_are_valid`, `invitation_storage_objects_exist`.
- Políticas de Storage definidas en 009 (no ejecutadas); 010/011 proporcionan validación a nivel de función SQL.

---

## 8. Estado de Edge Functions

| Archivo | Estado |
|---------|--------|
| `supabase/functions/submit-rsvp/index.ts` | ✅ Existe. CORS, límite de cuerpo, parseo JSON, verifyRecaptcha (servidor), hash de IP, rate limiting persistente, idempotencia, origen permitido, llamada a `submit_public_rsvp` con `service_role`. |
| `supabase/functions/_shared/rsvp-validation.ts` | ✅ Existe. Validación de entradas del formulario RSVP. |

**No desplegado.** Listo para desplegar en PROMPT MAESTRO 2.

---

## 9. Frontend

| Componente | Estado |
|------------|--------|
| `src/lib/data-service.ts` | ✅ Reescrito para Supabase. Todas las operaciones vía RPCs/Edge Function. |
| `src/lib/supabaseClient.ts` | ✅ Sin cambios (ya usaba Supabase). |
| `src/lib/database.types.ts` | ✅ Agregada `event_private_config`. |
| `ConfirmacionView.tsx` | ✅ Usa `registrarConfirmacion()` → Edge Function `submit-rsvp`. |
| `AdminLoginView.tsx` | ✅ `authenticateAdmin()` → `signInWithIdToken` + `get_current_admin_profile`. |
| `AdminDashboardView.tsx` | ✅ Tabs sin cambios. |
| `GuestList/GuestDetail/Payments/EventConfig/AuditLog/DashboardResume/AdminProfiles/CSVExport` | ✅ Mapeados a RPCs/admin de Supabase. |
| `InvitationEditorView.tsx` | ✅ Usa `lib/invitation-content` (Supabase). Componente huérfano (no en router), preservado como estaba. |

No se modificó el diseño visual aprobado. No se agregaron secciones de regalos, reproductores musicales ni elementos eliminados.

---

## 10. Pruebas ejecutadas y resultados

| Prueba | Archivo | Casos | Resultado |
|--------|---------|-------|-----------|
| Precios principales | `src/domain/pricing.test.ts` | 39 | ✅ 39/39 |
| Precios adicionales | `src/domain/pricing.additional.test.ts` | 21 | ✅ 21/21 |
| Roles administrativos | `src/domain/admin.security.test.ts` | 12 | ✅ 12/12 |
| Seguridad RPC | `src/domain/confirmacion.security.test.ts` | 66 | ✅ 66/66 |
| Contenido invitación | `src/domain/invitation-content.test.ts` | — | ✅ aprobado |
| Configuración pública | `src/domain/event-config.test.ts` | — | ✅ aprobado |
| Validación RSVP | `src/domain/rsvp-validation.test.ts` | — | ✅ aprobado |
| Arquitectura definitiva | `src/domain/definitive-architecture.test.ts` | 58 | ✅ 58/58 |
| Validación bloqueos (Etapa B) | `src/domain/etapa-b-validacion.test.ts` | 42 | ✅ 42/42 |
| **Total** | | **238** | **✅ 238/238 aprobadas** |

**Estática:** `npm run lint` ✅ limpio, `npm run build` ✅ exitoso.

Nota: Las pruebas son estáticas (verificación de archivos SQL y TypeScript). No se ejecutó PostgreSQL local ni Supabase remoto.

---

## 11. Bloqueos reales

| Bloqueo | Descripción | Resolución (PROMPT MAESTRO 2) |
|---------|-------------|-------------------------------|
| `.env.local` apunta a proyecto prohibido | `VITE_SUPABASE_URL = https://mlhzzxflesppeszlupza.supabase.co` | Actualizar a `unmsegdzihupqcihejut` (git-ignorado, nunca commitear) |
| CLI de Supabase no instalada | No se pudo verificar cuenta autenticada ni proyecto | Instalar CLI, hacer `supabase login` con `priscila.moya@mi.unc.edu.ar`, `supabase link --project-ref unmsegdzihupqcihejut` |
| Usuarios admin no creados | `matymoya18@gmail.com` (owner) y `priscila.moya@mi.unc.edu.ar` (editor) no existen en Auth | Crear en Supabase Auth, asignar roles vía `owner_set_admin_role` |
| Edge Function no desplegada | `submit-rsvp` existe localmente pero no en Supabase | Desplegar con variables de entorno de servidor |
| Migración 009 denegada | Algunas columnas de 009 no existen en el esquema actual (`reception_name`, `ceremony_name`, `directions_url`, `rsvp_rate_limit_requests`) | 010/011 implementan funcionalidad equivalente sin esas columnas; documentado como limitación conocida |

Ningún bloqueo impide la finalización del PROMPT MAESTRO 1/3. Todos se resuelven en PROMPT MAESTRO 2.

---

## 12. Confirmación de que no hubo operaciones remotas

✅ No se conectó a Supabase remoto (proyecto `unmsegdzihupqcihejut` ni ningún otro).  
✅ No se aplicaron migraciones remotas.  
✅ No se crearon cuentas de administrador en Auth.  
✅ No se desplegaron funciones Edge.  
✅ No se modificaron variables de entorno remotas.  
✅ No se hizo `git push` a GitHub.  
✅ No se desplegó en Vercel.  
✅ No se enviaron emails ni se configuraron recordatorios automáticos.  
✅ No se incluyeron contraseñas, tokens ni claves privadas en código, SQL, informes ni chat.  
✅ No se modificaron otros proyectos (XLMX Barber, Mercado Servicio, XV-ANTONELLA).  
✅ No se copió ni ejecutó la migración 009 denegada.

---

## 13. Criterio de finalización — PROMPT MAESTRO 1/3 cumplido

✅ Las nueve tablas de la arquitectura definitiva están implementadas.  
✅ Migraciones nuevas, coherentes y ordenadas (001–011, sin 009).  
✅ Eliminadas dependencias del modelo legado (`guests`, `payment_records`, `pricing_history`, `event_settings`, `registrar_confirmacion()`, `birth_date`).  
✅ `submit_public_rsvp` implementado con validación del servidor, protección contra abuso e idempotencia.  
✅ Cálculo seguro de precios en backend: bebé $0, niño $50.000, adulto desde comienzo $130.000, adulto después del almuerzo $70.000.  
✅ No se almacena `birth_date`; se usa `age_at_event`.  
✅ Frontend adaptado a la arquitectura definitiva (Supabase + Edge Function `submit-rsvp`).  
✅ Roles owner/editor con permisos aplicados en backend y RLS.  
✅ Auditoría, configuración del evento, revisiones de invitación y gestión de asistentes con soft delete y restore.  
✅ Storage preparado (`invitation-assets` bucket privado, validación de rutas y objetos).  
✅ Migración 009 denegada no modificada ni reproducida.  
✅ `npm run lint`, `npm run build` y todas las pruebas (238 casos) aprobadas.  
✅ Pruebas nuevas creadas para la arquitectura definitiva y para los bloqueos de la Etapa B.  
✅ No se realizaron operaciones remotas.  
✅ Proyecto listo para PROMPT MAESTRO 2.

**Entregable único:** `INFORME_FINAL_ENTREGA_TARJETA_CASAMIENTO.md` (este documento).
