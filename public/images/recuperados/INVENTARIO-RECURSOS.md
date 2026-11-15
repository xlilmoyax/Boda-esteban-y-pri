# INVENTARIO DE RECURSOS RECUPERADOS — ETAPA 3

## Fotografías originales de Canva (descargadas)

| Nombre local | Dimensiones original | Sección | Uso | Estado |
|--------------|---------------------|---------|-----|--------|
| `hero-original.jpg` | 1920×1439 | Portada | Imagen principal de portada | ✅ Recuperado |
| `wax-seal-original.png` | 644×799 | Portada, RSVP | Sello de cera dorado | ✅ Recuperado |
| `paper-texture-original.jpg` | 1600×1172 | Detalles, Regalos, Footer | Fondo texturado papel | ✅ Recuperado |
| `historia-foto-1.jpg` | 621×800 | Historia | Marco vacío, no se usa en la invitación | ⚠️ Conservado, sustituido |
| `historia-foto-2.jpg` | 600×800 | Historia | Fotografía ajena a la pareja, no se usa | ⚠️ Conservado, sustituido |
| `historia-foto-3.jpg`–`historia-foto-6.jpg` | 600×800 aprox. | Historia | Recursos de intentos anteriores; sustituidos por fotos verificadas de Canva | ⚠️ Conservados |
| `ornamento-fondo-1.png` | 1600×1600 | Ornamento general | Elemento decorativo Canva | ✅ Recuperado |
| `ornamento-fondo-2.png` | 648×800 | Ornamento general | Elemento decorativo Canva | ✅ Recuperado |
| `ornamento-fondo-3.png` | 799×685 | Ornamento general | Elemento decorativo Canva | ✅ Recuperado |
| `ornamento-fondo-4.png` | 613×800 | Ornamento general | Elemento decorativo Canva | ✅ Recuperado |
| `ornamento-movil-1.png` | 800×800 | Ornamento móvil | Elemento decorativo Canva móvil | ✅ Recuperado |
| `ornamento-movil-2.png` | 600×800 | Ornamento móvil | Elemento decorativo Canva móvil | ✅ Recuperado |

## Recursos originales adicionales verificados en Canva

| Nombre local | Recurso original | Sección | Uso |
|--------------|------------------|---------|-----|
| `historia-foto-comienzo-1.jpg` | `e2bf67e6dae9dbe526bdba03118583f8.jpg` | Historia (momento 1) | Pareja con ropa de trabajo |
| `historia-foto-comienzo-2.jpg` | `6db27d917b62c43a52ecf585f186bcf0.jpg` | Historia (momento 1) | Selfie de la pareja |
| `historia-foto-promesa-1.jpg` | `b0c4a5d86efd391fa48f943d0999435f.jpg` | Historia (momento 2) | Selfie de la pareja |
| `historia-foto-promesa-2.jpg` | `f68ab50ce3b08ed5a58c5fbe22d88f58.jpg` | Historia (momento 2) | Pareja junto al cartel |
| `historia-foto-cierre-1.jpg` | `c2d8fa795d8d49c55cf769c3a7c53e67.jpg` | Historia (momento 3) | Pareja al aire libre |
| `historia-foto-cierre-2.jpg` | `f647d39893dea90102c052b619c7ff2f.jpg` | Historia (momento 3) | Beso junto al agua |
| `pinza-fotografia-original.png` | `93d70700f95d169d8e3d5f40e0831ca6.png` | Historia | Pinza realista, reducida para sujetar el borde superior |
| `controles-musica-original.png` | `6b487926e897e7c6abefe16eb0c07936.png` | Música | Controles originales; botón central sigue conectado al reproductor |
| `footer-couple-original.png` | `b452a7c0c696f21301eb375c4a877099.png` | Cierre | Fotografía monocromática original de la pareja |

## Ornamentos SVG propios (creados — no emojis)

| Nombre | Elemento que representa | Sección | Estado |
|--------|------------------------|---------|--------|
| `nudo-cuerda.svg` | Nudo de cuerda trenzada | Música, Versículo, Cuenta regresiva | Pendiente |
| `dos-aves.svg` | Dos aves ornamentales | Historia (Momento 3) | Pendiente |
| `clip-papelería.svg` | Clip decorativo | Historia | Conservado, sustituido por la pinza original de Canva |
| `icono-traje.svg` | Traje (dress code) | Detalles | Pendiente |
| `icono-regalo.svg` | Regalo | Regalos | Pendiente |
| `icono-asistencia.svg` | Checklist asistencia | Confirmación | Pendiente |

## Limitaciones vigentes

| Recurso o comportamiento | Sección | Limitación |
|-------------------------|---------|------------|
| Formulario Canva embebido | Registro | Se conserva el formulario funcional del proyecto en `/confirmacion`; no se copió ni se conectó el formulario externo |
| Movimiento/transiciones propietarias de Canva | Página completa | Las capturas permiten revisar composición estática; no se pudo trasladar la implementación interna de Canva |
| Reproductor de música | Música | Se conserva el video confirmado por la pareja; su iframe de YouTube puede mostrar avisos de permisos/autoplay del navegador |

## Archivos locales existentes (no modificados)

| Nombre | Dimensiones | Sección actual |
|--------|-------------|----------------|
| `public/images/hero-couple.jpg` | 1920×1439 | Portada (se mantiene) |
| `public/images/wax-seal.png` | 644×799 | Portada (se mantiene como fallback) |
| `public/images/paper-texture.jpg` | 1600×1172 | Fondos (se mantiene como fallback) |
| `public/images/couple-kiss.jpg` | 800×600 | Historia (se mantiene como fallback) |
| `public/images/couple-portrait.jpg` | 599×799 | Historia (se mantiene como fallback) |
| `public/images/couple-stadium.jpg` | 600×800 | Historia (se mantiene como fallback) |

## Integración visual actual

- La portada, textura, sello, fotos de historia, controles musicales, pinzas y fotografía de cierre usan recursos recuperados de Canva.
- Se corrigieron los dos recursos de historia que eran un marco vacío y una foto ajena a la pareja.
- Las pinzas originales se muestran pequeñas en el borde superior de las fotos; el botón de música conserva su conexión al reproductor de YouTube ya existente.
- Los datos, la lógica del formulario, los precios, la transferencia, permisos, Supabase y migraciones no se modificaron en esta etapa.
- Capturas comparativas antes/después, a 1440×900 y 390×844: `evidencias-reconstruccion-prompt-1/`.
- El formulario de Canva y algunos comportamientos dinámicos siguen siendo diferencias de integración, no recursos perdidos.