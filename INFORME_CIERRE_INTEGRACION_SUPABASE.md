# INFORME CIERRE DE INTEGRACIÓN SUPABASE (PROMPT 2/3)

**Proyecto:** Tarjeta de Casamiento — Esteban y Priscila  
**Repositorio:** `C:\Users\prisc\OneDrive\Documentos\Tarjeta-de-Casamiento`  
**Proyecto Supabase autorizado:** `unmsegdzihupqcihejut` ("Casamiento Pri y Esteban")  
**Cuenta autorizada:** `priscila.moya@mi.unc.edu.ar`  
**Fecha:** 15 de noviembre de 2026  
**Estado:** INTEGRACIÓN PARCIALMENTE COMPLETADA — bloqueada por falta de secretos de servidor

---

## 1. Auditoría del código (ETAPA 1)

### 1.1 Archivos inspeccionados

| Archivo | Estado |
|---------|--------|
| `supabase/functions/submit-rsvp/index.ts` | ✅ Revisado — sin reCAPTCHA |
| `supabase/functions/_shared/rsvp-validation.ts` | ✅ Revisado — sin `captcha_token` |
| RPC `submit_public_rsvp` | ✅ Existe en remoto |
| RPC `consume_rsvp_rate_limit` | ✅ Existe en remoto |
| Cliente Supabase frontend | ✅ Usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |
| `.env.local` | ✅ Apunta a `unmsegdzihupqcihejut` |
| `.env.example` | ✅ Sin `VITE_RECAPTCHA_SITE_KEY` |

### 1.2 Verificaciones de seguridad

| Verificación | Resultado |
|--------------|-----------|
| No hay referencias a reCAPTCHA, `captcha_token` ni variables CAPTCHA | ✅ Confirmado |
| El código no espera ningún token CAPTCHA | ✅ Confirmado |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RSVP_IP_HASH_SECRET`, `RSVP_ALLOWED_ORIGINS` se usan correctamente en el servidor | ✅ Código correcto |
| La clave `service_role` se usa exclusivamente en el servidor (Edge Function) | ✅ Confirmado — nunca en frontend |
| Hash de IP proviene de encabezado `x-real-ip` del gateway | ✅ Implementado |
| CORS rechaza orígenes no autorizados (`RSVP_ALLOWED_ORIGINS`) | ✅ Implementado |
| Rate limiting e idempotencia funcionan correctamente | ✅ Implementado en RPCs |
| El servidor valida los datos y calcula los precios | ✅ Implementado en `submit_public_rsvp` |

### 1.3 Protecciones mantenidas (sin reCAPTCHA)

| Protección | Implementación |
|------------|---------------|
| Rate limiting persistente | `consume_rsvp_rate_limit` RPC con ventana de 900s y max 5 peticiones |
| Idempotencia | `submit_public_rsvp` con advisory lock + `rsvp_request_results` + hash de payload |
| Validación estricta del servidor | `parseSubmission()` valida UUID, email, edades, restricciones, longitudes |
| Límite de tamaño del cuerpo | 32 KB máximo |
| CORS con orígenes permitidos | `RSVP_ALLOWED_ORIGINS` |
| Hash de IP mediante secreto del servidor | HMAC-SHA256 con `RSVP_IP_HASH_SECRET` |
| Precios exclusivamente en backend | `submit_public_rsvp` → `calculate_attendee_price` |

---

## 2. Secretos verificados (ETAPA 2)

### Estado en Supabase remoto

`supabase secrets list --remote` devolvió `{"secrets":[]}` — **ningún secreto configurado**.

| Secreto | Estado | Valor mostrado |
|---------|--------|----------------|
| `SUPABASE_URL` | ❌ NO CONFIGURADO | (no se muestra) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ NO CONFIGURADO | (no se muestra) |
| `RSVP_IP_HASH_SECRET` | ❌ NO CONFIGURADO | (no se muestra) |
| `RSVP_ALLOWED_ORIGINS` | ❌ NO CONFIGURADO | (no se muestra) |

### Conclusión de ETAPA 2

**No se puede proceder al despliegue.** Los 4 secretos requeridos por la Edge Function no están configurados en el proyecto remoto. La función `submit-rsvp` fallaría al iniciar porque `requiredEnv()` lanzaría error para cualquiera de estos valores faltantes.

**Acción requerida:** Configurar estos 4 secretos en el dashboard de Supabase (Configuración > Edge Functions > Variables de entorno) o mediante `supabase secrets set` desde la CLI autenticada con `priscila.moya@mi.unc.edu.ar`.

No se solicitaron ni se mostraron valores de secretos en este informe, cumpliendo con las reglas de seguridad.

---

## 3. Estado del despliegue (ETAPA 3)

**No desplegado.** La Edge Function `submit-rsvp` existe localmente en `supabase/functions/submit-rsvp/index.ts` pero no se ha desplegado en `unmsegdzihupqcihejut` porque faltan los secretos de servidor obligatorios.

No se desplegó ninguna otra función.

---

## 4. Pruebas realizadas y resultados

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
- `npm run lint` ✅ limpio (`tsc --noEmit` sin errores)
- `npm run build` ✅ exitoso (1644 módulos)

**Nota:** Las pruebas son estáticas (verificación de archivos SQL y TypeScript). No se ejecutaron pruebas de integración remota porque la Edge Function no está desplegada.

---

## 5. Problemas pendientes

| Bloqueo | Descripción | Resolución requerida |
|---------|-------------|---------------------|
| Secretos de servidor no configurados | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RSVP_IP_HASH_SECRET`, `RSVP_ALLOWED_ORIGINS` no existen en Supabase remoto | Configurar en dashboard de Supabase o `supabase secrets set` |
| Edge Function no desplegada | `submit-rsvp` no puede iniciarse sin los secretos | Desplegar tras configurar secretos |
| `.env.local` clave anon key | `VITE_SUPABASE_ANON_KEY` está presente pero debe ser verificada como válida para `unmsegdzihupqcihejut` | Verificar que coincida con el proyecto autorizado |

---

## 6. Confirmación del proyecto utilizado

✅ Proyecto autorizado: `unmsegdzihupqcihejut` ("Casamiento Pri y Esteban")  
✅ Cuenta autenticada: `priscila.moya@mi.unc.edu.ar`  
✅ No se utilizó ningún otro proyecto Supabase  
✅ No se reintrodujo Google reCAPTCHA  
✅ No se realizó `git push`  
✅ No se publicó en Vercel  
✅ No se modificaron roles ni usuarios  
✅ No se alteraron reglas de precios  
✅ No se modificó el diseño de la invitación

---

## 7. Próximos pasos (pendiente de configuración de secretos)

1. Configurar los 4 secretos de servidor en Supabase (dashboard o CLI)
2. Desplegar: `supabase functions deploy submit-rsvp --remote=unmsegdzihupqcihejut`
3. Verificar que Supabase registre la función como desplegada
4. Ejecutar pruebas de integración remota contra la función desplegada
5. Verificar que el frontend se conecta al proyecto correcto mediante `.env.local`

**Detenido en ETAPA 2.** El despliegue no puede completarse sin los secretos de servidor configurados. No se declarará el sistema operativo sin evidencia del despliegue exitoso.
