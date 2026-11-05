# Tarjeta de Casamiento — Esteban y Priscila

Tarjeta digital de casamiento con panel administrativo, confirmación de asistencia, cálculo de precios por rango de edad y gestión de pagos informados.

## Tecnologías
- React 18, Vite 5, TypeScript, Tailwind CSS 3
- Supabase (PostgreSQL, Auth, RLS)

## Estructura
- `src/` — código fuente (componentes, lib, tipos)
- `supabase/migrations/` — migraciones SQL versionadas
- `.env.example` — variables de entorno de ejemplo

## Instalación local
```bash
npm install
cp .env.example .env.local
# Editar .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Variables de entorno
| Variable | Público/Privado | Descripción |
|---|---|---|
| VITE_SUPABASE_URL | Público | URL del proyecto Supabase |
| VITE_SUPABASE_ANON_KEY | Público | Clave publicable (anon key) de Supabase |

## Scripts
- `npm run dev` — servidor de desarrollo (puerto 3000)
- `npm run build` — build de producción
- `npm run preview` — previsualizar build
- `npm run lint` — chequeo de tipos TypeScript

## Invitación
La portada, los relatos, la confirmación y los detalles del evento se construyen como componentes React responsivos. La música usa el reproductor oficial de YouTube y comunica cuando el navegador bloquea el autoplay. Las animaciones respetan `prefers-reduced-motion`.

## Alcance
Sin correos automáticos. Sin pasarela de pago. Los pagos se informan y verifican manualmente desde el panel administrativo.
