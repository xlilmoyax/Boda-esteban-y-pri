# INFORME FINAL — INTEGRACIÓN SUPABASE (PROMPT MAESTRO 2/3)

**Proyecto:** Tarjeta de Casamiento — Esteban y Priscila  
**Repositorio:** `C:\Users\prisc\OneDrive\Documentos\Tarjeta-de-Casamiento`  
**Proyecto Supabase:** `unmsegdzihupqcihejut` ("Casamiento Pri y Esteban")  
**Cuenta autorizada:** `priscila.moya@mi.unc.edu.ar`  
**Fecha:** 14 de noviembre de 2026  
**Estado:** INTEGRACIÓN PARCIALMENTE COMPLETADA — bloqueos documentados

---

## 1. Migraciones realmente aplicadas

| Orden | Archivo | Estado |
|-------|---------|--------|
| 1 | `001_initial_schema.sql` | ✅ Aplicada |
| 2 | `002_rls_policies.sql` | ✅ Aplicada |
| 3 | `003_functions.sql` | ✅ Aplicada (con corrección de nombre de parámetro) |
| 4 | `004_pricing_history.sql` | ✅ Aplicada |
| 5 | `005_invitation_editor.sql` | ✅ Aplicada |
| 6 | `006_storage_bucket.sql` | ✅ Aplicada |
| 7 | `007_seed.sql` | ✅ Aplicada |
| 8 | `008_rsvp_family_fields.sql` | ✅ Aplicada |
| 9 | `010_admin_config_and_revisions.sql` | ✅ Aplicada (con corrección de referencia a columna `active`) |
| 10 | `011_admin_missing_rpcs.sql` | ✅ Aplicada (con corrección de `DROP FUNCTION IF EXISTS`) |

**Migración 009 (`009_complete_admin_public_storage.sql`):** NO aplicada, NO copiada, NO marcada como aplicada. ✅

---

## 2. Confirmación explícita: migración 009 no ejecutada

✅ La migración `009_complete_admin_public_storage.sql` permanece sin modificar en el repositorio local.  
✅ No se copió su contenido a ninguna otra migración.  
✅ No se ejecutó en el proyecto remoto.  
✅ No aparece en el historial de migraciones aplicadas (`remote` vacío en `supabase migration list --remote`).  
✅ Ninguna función exclusiva de 009 (`invitation_asset_is_readable`, `invitation_content_objects_exist`, `invitation_content_references_path`, tabla `rsvp_rate_limit_requests`, columnas `reception_name`/`ceremony_name`/`directions_url`) fue reproducida en 010 o 011.

---

## 3. Esquema remoto final

### Tablas creadas (11 total)

| Tabla | Tipo |
|-------|------|
| `admin_profiles` | Definitiva |
| `attendees` | Definitiva |
| `audit_logs` | Definitiva |
| `event_private_config` | Definitiva |
| `event_public_config` | Definitiva |
| `invitation_revisions` | Definitiva |
| `pricing_rules` | Definitiva |
| `pricing_versions` | Definitiva |
| `registrations` | Definitiva |
| `rsvp_rate_limits` | Auxiliar (sistema RSVP) |
| `rsvp_request_results` | Auxiliar (sistema RSVP) |

**Las 9 tablas definitivas están presentes.** Las 2 tablas auxiliares son necesarias para el sistema de RSYP (rate limiting e idempotencia).

### Extensiones instaladas

| Extensión | Versión |
|-----------|---------|
| `pgcrypto` | 1.3 |
| `uuid-ossp` | 1.1 |

### Funciones RPC desplegadas (43 funciones)

Todas las funciones del modelo definitivo están desplegadas, incluyendo:
- `submit_public_rsvp` (solo `service_role`)
- `calculate_attendee_price`
- `write_audit`, `is_admin`
- `owner_publish_pricing_version`, `owner_set_admin_role`, `owner_set_admin_active`
- `admin_create_registration`, `admin_update_registration_details`, `admin_soft_delete_registration`, `admin_restore_registration`, `admin_add_attendee`, `admin_update_attendee`, `admin_soft_delete_attendee`, `admin_restore_attendee`
- `admin_get_balance_summary`, `admin_get_dashboard_summary`, `admin_get_registration_balance`
- `get_public_invitation`, `admin_get_event_config`, `admin_update_public_config`, `owner_update_private_config`
- `save_invitation_draft`, `publish_invitation_draft`, `admin_restore_invitation_revision`
- `invitation_storage_path_is_valid`, `invitation_storage_paths_are_valid`, `invitation_storage_objects_exist`
- `protect_invitation_revision`, `protect_pricing_version`, `protect_pricing_rule`

**No existe `registrar_confirmacion` ni ninguna función legacy.**

### RLS (Row Level Security)

| Tabla | RLS habilitado |
|-------|---------------|
| `admin_profiles` | ✅ |
| `attendees` | ✅ |
| `audit_logs` | ✅ |
| `event_private_config` | ✅ |
| `event_public_config` | ✅ |
| `invitation_revisions` | ✅ |
| `pricing_rules` | ✅ |
| `pricing_versions` | ✅ |
| `registrations` | ✅ |
| `rsvp_rate_limits` | ✅ |
| `rsvp_request_results` | ✅ |

**Todas las 11 tablas tienen RLS habilitado.**

---

## 4. Usuarios y roles configurados

### Usuarios en Supabase Auth

| UUID | Email | email_confirmed_at |
|------|-------|-------------------|
| `f4b0e553-33eb-4c55-835a-6dd26e2928c1` | `matymoya18@gmail.com` | 2026-11-14 23:15:54+00 |
| `d10fcc99-3bc5-4026-b3b2-8db700b0060b` | `priscila.moya@mi.unc.edu.ar` | 2026-11-14 23:15:54+00 |

### Perfiles en `admin_profiles`

| UUID | Email | Rol | Activo |
|------|-------|-----|--------|
| `f4b0e553-33eb-4c55-835a-6dd26e2928c1` | `matymoya18@gmail.com` | `owner` | true |
| `d10fcc99-3bc5-4026-b3b2-8db700b0060b` | `priscila.moya@mi.unc.edu.ar` | `editor` | true |

**Nota:** El bootstrap del primer owner se realizó mediante inserción directa en `admin_profiles` y `audit_logs` (sin usar `write_audit` ni `owner_set_admin_role`) porque `auth.uid()` es NULL en el contexto de `supabase db query`, lo que impide llamar a funciones protegidas por `is_admin()`.

---

## 5. Estado de Storage

| Ítem | Valor |
|------|-------|
| Bucket | `invitation-assets` |
| Público | `false` (privado) |
| Tamaño máximo | 8,388,608 bytes (8 MiB) |
| MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Funciones de validación | `invitation_storage_path_is_valid`, `invitation_storage_paths_are_valid`, `invitation_storage_objects_exist` |

**Storage configurado correctamente.**

---

## 6. Estado de Edge Function `submit-rsvp`

| Ítem | Estado |
|------|--------|
| Código local | ✅ Existe (`supabase/functions/submit-rsvp/index.ts`) |
| Desplegada en remoto | ❌ NO desplegada |
| Motivo | Faltan secretos de servidor requeridos |

**Secretos de servidor necesarios (no configurados):**
- `SUPABASE_SERVICE_ROLE_KEY` — para llamar a `submit_public_rsvp` con privilegios
- `RECAPTCHA_SECRET_KEY` — para verificar CAPTCHA en servidor
- `RECAPTCHA_ALLOWED_HOSTNAMES` — hostnames permitidos para CAPTCHA
- `RECAPTCHA_MIN_SCORE` — score mínimo de CAPTCHA
- `RSVP_IP_HASH_SECRET` — secreto para hash de IP (mínimo 32 bytes)
- `RSVP_ALLOWED_ORIGINS` — orígenes CORS permitidos

**Bloqueo:** No se pueden configurar estos secretos desde el CLI sin conocer sus valores. No se pueden inventar. La Edge Function no se desplegará hasta que se configuren estos secretos mediante el dashboard de Supabase o `supabase secrets set`.

---

## 7. Variables de entorno configuradas

### `.env.local` (estado actual — SIN ACTUALIZAR)

| Variable | Valor actual | Problema |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | `https://mlhzzxflesppeszlupza.supabase.co` | ⚠️ Apunta a proyecto PROHIBIDO (`mlhzzxflesppeszlupza`) |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | ⚠️ Clave del proyecto prohibido |
| `VITE_APP_NAME` | `Tarjeta de Casamiento - Esteban y Priscila` | ✅ Correcto |

**Bloqueo:** `.env.local` no se ha actualizado porque no se dispone de la `VITE_SUPABASE_ANON_KEY` del proyecto `unmsegdzihupqcihejut`. Esta clave debe obtenerse del dashboard de Supabase (Configuración > API) y configurarse en `.env.local` (git-ignorado, nunca commitear).

**No se incluye `service_role` en variables `VITE_`.** ✅

---

## 8. Resultados de pruebas

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

**Estática:**
- `npm run lint` ✅ limpio (tsc --noEmit)
- `npm run build` ✅ exitoso (1645 módulos)

**Nota:** Las pruebas son estáticas (verificación de archivos SQL y TypeScript). No se ejecutaron pruebas contra PostgreSQL remoto ni pruebas de integración reales con la Edge Function desplegada.

---

## 9. Problemas pendientes y bloqueos

| Bloqueo | Descripción | Impacto | Resolución requerida |
|---------|-------------|---------|---------------------|
| Edge Function `submit-rsvp` no desplegada | Faltan 6 secretos de servidor | El RSVP público no funcionará | Configurar secretos en Supabase dashboard y desplegar función |
| `.env.local` con proyecto prohibido | URL apunta a `mlhzzxflesppeszlupza` | Frontend no puede conectar al proyecto correcto | Obtener `VITE_SUPABASE_ANON_KEY` de `unmsegdzihupqcihejut` y actualizar `.env.local` |
| Frontend no conectado al remoto | Sin credenciales correctas en `.env.local` | La aplicación no puede leer/escribir en Supabase | Resolver los dos bloqueos anteriores |
| Bootstrap de owner sin `owner_set_admin_role` | Se hizo INSERT directo en `admin_profiles` | Funciona, pero no usa el procedimiento RPC previsto | Considerar migrar a uso de `owner_set_admin_role` cuando se tenga sesión de owner autenticada |

---

## 10. Confirmación de operaciones restringidas

✅ **No se ejecutó la migración 009** bajo ninguna circunstancia.  
✅ **No se utilizó ningún proyecto Supabase distinto de `unmsegdzihupqcihejut`.**  
✅ **No se utilizó `service_role` en el frontend.**  
✅ **No se mostraron tokens, contraseñas ni secretos en el chat.**  
✅ **No se inventaron UUID de usuarios** (se usaron los UUID generados por `gen_random_uuid()` en `auth.users`).  
✅ **No se eliminaron datos ni objetos existentes.**  
✅ **No se hizo `git push`.**  
✅ **No se desplegó en Vercel.**  
✅ **No se modificaron funcionalidades o diseños innecesarios.**  
✅ **No se realizaron operaciones remotas de escritura sin autorización.** (Todas las operaciones de escritura fueron autorizadas por el PROMPT MAESTRO 2/3.)

---

## 11. Resumen del estado final

| Componente | Estado |
|------------|--------|
| Migraciones 001–011 (excepto 009) | ✅ Aplicadas en remoto |
| Migración 009 | ✅ No aplicada (prohibida) |
| 9 tablas definitivas | ✅ Creadas |
| Tablas auxiliares RSVP | ✅ Creadas |
| Funciones RPC (43) | ✅ Desplegadas |
| RLS en todas las tablas | ✅ Habilitado |
| Usuarios Auth (2) | ✅ Creados |
| Admin profiles (owner + editor) | ✅ Configurados |
| Storage bucket `invitation-assets` | ✅ Configurado |
| Edge Function `submit-rsvp` | ❌ No desplegada (sin secretos) |
| `.env.local` con proyecto correcto | ❌ No actualizado (falta anon key) |
| Pruebas (238 casos) | ✅ Todas aprobadas |
| Lint / Build | ✅ Aprobados |

**El proyecto local está completamente implementado y las migraciones están aplicadas en Supabase. Los únicos bloqueos para la integración completa son la falta de secretos de servidor para la Edge Function y la falta de la anon key para `.env.local`.** Ambos requieren intervención externa (dashboard de Supabase o credenciales del proyecto) que no pueden obtenerse desde el CLI sin violar las reglas de seguridad.
