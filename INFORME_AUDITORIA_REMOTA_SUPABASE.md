# INFORME AUDITORÍA REMOTA SUPABASE — PROMPT MAESTRO 2/3

**Proyecto:** Tarjeta de Casamiento — Esteban y Priscila  
**Repositorio:** `C:\Users\prisc\OneDrive\Documentos\Tarjeta-de-Casamiento`  
**Proyecto Supabase autorizado:** `unmsegdzihupqcihejut` ("Casamiento Pri y Esteban")  
**Cuenta autorizada:** `priscila.moya@mi.unc.edu.ar`  
**Fecha:** 14 de noviembre de 2026  
**Modalidad:** Exclusivamente lectura. Ninguna escritura remota realizada.

---

## 1. Verificación de conexión (ETAPA 1)

| Verificación | Resultado |
|--------------|-----------|
| `supabase projects list` | ✅ Ejecutado exitosamente |
| Proyecto autorizado visible | ✅ `unmsegdzihupqcihejut` ("Casamiento Pri y Esteban") |
| Proyecto vinculado | ✅ `linked: true` |
| Región | `us-west-2` |
| Estado | `ACTIVE_HEALTHY` |
| Versión PostgreSQL | 17.11.0.019 |
| Creado | 2026-11-12T13:54:33.649422Z |

**Discrepancias:** Ninguna. El proyecto vinculado es exactamente `unmsegdzihupqcihejut`.

---

## 2. Auditoría remota de solo lectura (ETAPA 2)

### 2.1 Tablas y columnas en esquema `public`

El esquema `public` está **completamente vacío**. No existen tablas de aplicación.

Tablas del sistema presentes (no son de aplicación):
- `auth.*` (usuarios, sesiones, identidades, etc.)
- `realtime.*` (mensajes, suscripciones)
- `storage.*` (buckets, objetos)
- `vault.*` (secretos)

### 2.2 Funciones RPC

El esquema `public` no tiene funciones definidas. No existen:
- `submit_public_rsvp`
- `calculate_attendee_price`
- `write_audit`
- `is_admin`
- `admin_create_registration`
- `admin_update_registration_details`
- `admin_get_balance_summary`
- `admin_get_dashboard_summary`
- `owner_publish_pricing_version`
- `owner_set_admin_role`
- `owner_set_admin_active`
- `get_current_admin_profile`
- `get_public_invitation`
- `save_invitation_draft`
- `publish_invitation_draft`
- `admin_restore_invitation_revision`
- Ninguna otra función del modelo definitivo

### 2.3 Políticas RLS

No existen políticas RLS porque no hay tablas en el esquema `public`.

### 2.4 Triggers

No existen triggers definidos.

### 2.5 Extensiones

| Extensión | Versión |
|-----------|---------|
| `pgcrypto` | 1.3 |
| `uuid-ossp` | 1.1 |

Ambas extensiones necesarias para el modelo definitivo están instaladas.

### 2.6 Usuarios de Supabase Auth

La tabla `auth.users` está vacía. No existen usuarios registrados:
- `matymoya18@gmail.com` (owner) → **NO EXISTE**
- `priscila.moya@mi.unc.edu.ar` (editor) → **NO EXISTE**

### 2.7 Buckets de Storage

No se pudieron listar buckets mediante `supabase storage ls` (requiere flag `--experimental`), pero las tablas de storage están vacías. No existe el bucket `invitation-assets`.

### 2.8 Edge Functions desplegadas

| Función | Estado |
|---------|--------|
| `submit-rsvp` | ❌ No desplegada |

`supabase functions list --remote=unmsegdzihupqcihejut` devolvió `{"functions":[]}`.

### 2.9 Migraciones registradas

No hay migraciones aplicadas en el proyecto remoto. El historial de migraciones está vacío.

### 2.10 Resumen del estado remoto

El proyecto `unmsegdzihupqcihejut` está **limpio y vacío** en cuanto a esquema de aplicación. Solo contiene infraestructura del sistema de Supabase (auth, storage, realtime, vault) y las extensiones `pgcrypto` y `uuid-ossp`.

---

## 3. Comparación local/remota (ETAPA 3)

### 3.1 Objetos que faltan en remoto (todos)

| Categoría | Objetos locales | Estado remoto |
|-----------|----------------|---------------|
| Tablas definitivas | `admin_profiles`, `event_public_config`, `event_private_config`, `pricing_versions`, `pricing_rules`, `registrations`, `attendees`, `audit_logs`, `invitation_revisions` | ❌ Ninguna existe |
| Tablas auxiliares | `rsvp_request_results`, `rsvp_rate_limits` | ❌ Ninguna existe |
| Funciones RPC | `write_audit`, `is_admin`, `calculate_attendee_price`, `submit_public_rsvp`, `admin_create_registration`, `admin_update_registration_details`, `admin_get_balance_summary`, `admin_get_dashboard_summary`, `owner_publish_pricing_version`, `owner_set_admin_role`, `owner_set_admin_active`, `get_current_admin_profile`, `get_public_invitation`, `save_invitation_draft`, `publish_invitation_draft`, `admin_restore_invitation_revision`, `admin_update_public_config`, `owner_update_private_config`, `invitation_storage_path_is_valid`, `invitation_storage_paths_are_valid`, `invitation_storage_objects_exist`, `protect_invitation_revision` | ❌ Ninguna existe |
| Políticas RLS | Todas las tablas del modelo definitivo | ❌ Ninguna existe |
| Triggers | `invitation_revisions_immutable` | ❌ No existe |
| Bucket Storage | `invitation-assets` | ❌ No existe |
| Edge Functions | `submit-rsvp` | ❌ No desplegada |
| Usuarios Auth | `matymoya18@gmail.com` (owner), `priscila.moya@mi.unc.edu.ar` (editor) | ❌ No existen |

### 3.2 Objetos que ya existen en remoto

| Objeto | Versión | Notas |
|--------|---------|-------|
| Extensión `pgcrypto` | 1.3 | ✅ Ya instalada (necesaria para `gen_random_uuid()`) |
| Extensión `uuid-ossp` | 1.1 | ✅ Ya instalada |

### 3.3 Diferencias de estructura

No hay diferencias de estructura porque el esquema remoto está vacío. Todas las migraciones locales 001–011 (excepto 009) deben aplicarse desde cero.

### 3.4 Funciones incompatibles

Ninguna, porque no hay funciones en remoto.

### 3.5 Posibles conflictos con datos existentes

No hay datos existentes en el esquema `public`. No hay conflictos.

### 3.6 Migraciones que pueden aplicarse sin riesgo

Todas las migraciones 001–011 (excepto 009) pueden aplicarse sin riesgo porque el esquema está vacío.

| Orden | Archivo | Riesgo |
|-------|---------|--------|
| 1 | `001_initial_schema.sql` | Bajo (crea tablas desde cero) |
| 2 | `002_rls_policies.sql` | Bajo (RLS y políticas) |
| 3 | `003_functions.sql` | Bajo (funciones de auditoría) |
| 4 | `004_pricing_history.sql` | Bajo (precios, RSVP, soft delete) |
| 5 | `005_invitation_editor.sql` | Bajo (RLS revisiones) |
| 6 | `006_storage_bucket.sql` | Bajo (bucket Storage) |
| 7 | `007_seed.sql` | Bajo (datos iniciales idempotentes) |
| 8 | `008_rsvp_family_fields.sql` | Bajo (campos familia, submit_public_rsvp expandida) |
| 9 | `010_admin_config_and_revisions.sql` | Bajo (configuración, revisiones, validación Storage) |
| 10 | `011_admin_missing_rpcs.sql` | Bajo (RPCs administrativas, firmas alineadas) |

**Migración 009 (`009_complete_admin_public_storage.sql`):** PROHIBIDA. No se aplica, no se copia, no se marca como aplicada.

---

## 4. Plan definitivo de integración (ETAPA 4)

### 4.1 Migraciones a aplicar (orden exacto)

```
001_initial_schema.sql   → 9 tablas definitivas + invitation_content_is_safe()
002_rls_policies.sql     → RLS, is_admin(), grants, políticas de lectura
003_functions.sql        → write_audit(), is_admin()
004_pricing_history.sql  → calculate_attendee_price(), submit_public_rsvp(), soft delete, balance
005_invitation_editor.sql→ RLS invitation_revisions
006_storage_bucket.sql   → bucket invitation-assets (privado, 8 MiB)
007_seed.sql             → 4 tarifas oficiales (bebé $0, niño $50.000, adulto $130.000, post-almuerzo $70.000)
008_rsvp_family_fields.sql → song_suggestion, dietary_restrictions, dietary_details
010_admin_config_and_revisions.sql → get_public_invitation, admin_update_public_config, owner_update_private_config, save_invitation_draft, publish_invitation_draft, admin_restore_invitation_revision, validación Storage
011_admin_missing_rpcs.sql → get_current_admin_profile, owner_set_admin_role, owner_set_admin_active, admin_get_event_config, admin_update_event_public_config, admin_update_registration_details, admin_get_dashboard_summary, admin_get_balance_summary
```

### 4.2 Modificaciones locales necesarias

Ninguna. Las migraciones 001–011 están listas para aplicar tal como están en el repositorio local.

### 4.3 Usuarios existentes y faltantes

| Usuario | Rol | Existe en Auth | Acción requerida |
|---------|-----|----------------|------------------|
| `matymoya18@gmail.com` | owner | ❌ No existe | Crear en Supabase Auth, confirmar email, asignar rol owner |
| `priscila.moya@mi.unc.edu.ar` | editor | ❌ No existe | Crear en Supabase Auth, confirmar email, asignar rol editor |

### 4.4 Bootstrap seguro del primer owner

1. Aplicar migraciones 001–011 (excepto 009).
2. Crear usuario `matymoya18@gmail.com` en Supabase Auth (mediante invitación o registro directo).
3. Confirmar email del usuario owner.
4. Insertar en `admin_profiles` con `id` del usuario de Auth, `email = 'matymoya18@gmail.com'`, `role = 'owner'`, `active = true`.
5. Ejecutar `owner_set_admin_role` para asignar rol `editor` a `priscila.moya@mi.unc.edu.ar` (después de crear su usuario en Auth).

**Importante:** `owner_set_admin_role` requiere que ya exista un owner en `admin_profiles` para poder asignar roles. El primer owner debe crearse manualmente.

### 4.5 Configuración de Storage

1. Crear bucket `invitation-assets` (migración 006 ya lo define).
2. Configurar políticas de acceso:
   - Inserción: solo `authenticated` con `is_admin('editor')` y ruta UUID válida
   - Selección: solo `authenticated` con `is_admin('editor')` y ruta UUID válida
3. Las funciones `invitation_storage_path_is_valid()`, `invitation_storage_paths_are_valid()`, `invitation_storage_objects_exist()` validan rutas en 010.

### 4.6 Despliegue de Edge Function `submit-rsvp`

1. Desplegar: `supabase functions deploy submit-rsvp --remote=unmsegdzihupqcihejut`
2. Configurar secretos de servidor (vía `supabase secrets set` o dashboard de Supabase):
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RECAPTCHA_SECRET_KEY`
   - `RECAPTCHA_ALLOWED_HOSTNAMES`
   - `RECAPTCHA_MIN_SCORE`
   - `RSVP_IP_HASH_SECRET`
   - `RSVP_ALLOWED_ORIGINS`
3. **Nunca** incluir estos secretos en `VITE_` variables ni en el frontend.

### 4.7 Secretos del servidor necesarios

| Secreto | Propósito | Dónde configurar |
|---------|-----------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Llamar a `submit_public_rsvp` con privilegios | Supabase dashboard / `supabase secrets set` |
| `RECAPTCHA_SECRET_KEY` | Verificar CAPTCHA en servidor | Supabase dashboard / `supabase secrets set` |
| `RECAPTCHA_ALLOWED_HOSTNAMES` | Hostnames permitidos para CAPTCHA | Supabase dashboard / `supabase secrets set` |
| `RECAPTCHA_MIN_SCORE` | Score mínimo de CAPTCHA (ej. 0.5) | Supabase dashboard / `supabase secrets set` |
| `RSVP_IP_HASH_SECRET` | Secreto para hash de IP (mínimo 32 bytes) | Supabase dashboard / `supabase secrets set` |
| `RSVP_ALLOWED_ORIGINS` | Orígenes CORS permitidos | Supabase dashboard / `supabase secrets set` |

### 4.8 Variables de entorno frontend (`.env.local`)

| Variable | Valor requerido | Nota |
|----------|-----------------|------|
| `VITE_SUPABASE_URL` | `https://unmsegdzihupqcihejut.supabase.co` | Debe actualizarse (actualmente apunta a proyecto prohibido) |
| `VITE_SUPABASE_ANON_KEY` | Clave anon del proyecto `unmsegdzihupqcihejut` | Debe actualizarse |
| `VITE_APP_NAME` | `Tarjeta de Casamiento - Esteban y Priscila` | Ya definido |

**Nota:** `.env.local` debe mantenerse git-ignorado. Nunca commitear.

### 4.9 Pruebas de verificación de integración

Después de aplicar migraciones y desplegar:

1. **Conexión:** `supabase status` muestra proyecto vinculado
2. **Tablas:** Todas las 9 tablas definitivas existen en `public`
3. **RLS:** Todas las tablas tienen RLS habilitado
4. **Funciones:** `submit_public_rsvp` ejecutable solo por `service_role`
5. **Precios:** `calculate_attendee_price` devuelve precios correctos (bebé $0, niño $50.000, adulto $130.000, post-almuerzo $70.000)
6. **RSVP público:** Edge Function `submit-rsvp` responde correctamente con CAPTCHA y rate limiting
7. **Admin:** `owner_set_admin_role` asigna roles correctamente
8. **Soft delete:** `admin_soft_delete_registration` y `admin_restore_registration` funcionan
9. **Storage:** Bucket `invitation-assets` accesible con políticas correctas
10. **Auditoría:** `write_audit` registra operaciones administrativas

---

## 5. Riesgos y posibles impactos

| Riesgo | Severidad | Descripción | Mitigación |
|--------|-----------|-------------|------------|
| Esquema remoto vacío | Informativo | El proyecto está vacío, todas las migraciones aplican desde cero | Ninguna necesaria |
| Sin usuarios Auth | Alta | No hay usuarios creados, necesario para bootstrap de owner | Crear usuarios en Auth antes de asignar roles |
| Sin Edge Function desplegada | Media | `submit-rsvp` no está desplegada, el RSVP público no funcionará | Desplegar después de migraciones |
| `.env.local` con proyecto prohibido | Alta | URL apunta a `mlhzzxflesppeszlupza` (prohibido) | Actualizar a `unmsegdzihupqcihejut` antes de conectar frontend |
| Migración 009 denegada | Informativo | Algunas columnas de 009 no existen en el esquema local | 010/011 implementan equivalente sin esas columnas |
| CLI Docker no disponible | Baja | `supabase status` falla por falta de Docker, pero no afecta operaciones remotas | No afecta la integración |

---

## 6. Confirmación de solo lectura

✅ No se conectó a Supabase remoto para escritura  
✅ No se aplicaron migraciones remotas  
✅ No se crearon usuarios en Auth  
✅ No se desplegaron funciones Edge  
✅ No se modificó `.env.local`  
✅ No se hizo `git push`  
✅ No se mostró ningún secreto ni token  
✅ No se seleccionó proyecto alternativo  
✅ La migración 009 no fue ejecutada ni copiada

---

## 7. Próximos pasos (pendiente de autorización expresa)

Este informe detalla el estado actual y el plan. **No se ha realizado ninguna escritura remota.** Se requiere autorización expresa para:

1. Autenticar CLI con `priscila.moya@mi.unc.edu.ar` (requiere entorno TTY o `--token`)
2. Actualizar `.env.local` con credenciales de `unmsegdzihupqcihejut`
3. Aplicar migraciones 001–011 (excepto 009)
4. Crear usuarios en Auth y asignar roles
5. Desplegar Edge Function `submit-rsvp`
6. Configurar secretos de servidor

**Detenido al terminar el informe.** No se realizará ninguna escritura remota sin autorización expresa posterior.
