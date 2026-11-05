# Especificación de reconstrucción — Esteban y Priscila

Referencia visual:
https://eventocualquiera.my.canva.site/casamientoestebanypriscila

## Reglas
- Validar los cambios localmente antes de publicarlos.
- Preservar el formulario y la lógica existente de confirmación.
- No realizar escrituras remotas en Supabase.
- No cambiar el esquema de Supabase por motivos visuales.
- Publicar solo en el repositorio GitHub confirmado; no desplegar en Vercel hasta verificar el proyecto.
- No inventar recursos gráficos, datos de contacto ni datos bancarios; usar los datos bancarios solo si la pareja confirma los de las referencias.
- Mantener React, TypeScript y Vite; se añade únicamente el ejecutor ligero de las pruebas TypeScript existentes.

## Identidad visual
- Papel marfil texturado.
- Secciones amplias color bordó texturado.
- Tipografía serif fina y caligrafía manuscrita.
- Detalles dorados.
- Collages asimétricos, fotos recortadas e ilustraciones lineales.
- Amplio espacio negativo y cambios de ritmo entre secciones.

## Orden de las secciones
1. Portada fotográfica con nombres, fecha, sello dorado y degradado.
2. Cuenta regresiva.
3. Reproductor musical, condicionado a disponer de audio real.
4. Versículo de Eclesiastés 4:9-12.
5. Fecha, recepción, salón, horario y acceso a ubicación.
6. Relato «Un encuentro casual».
7. Relato «Un amor que eligió quedarse».
8. Relato «Una promesa para siempre».
9. Collages y fotografía con recorte de corazón.
10. Confirmación de asistencia.
11. Dress code: Elegante.
12. Regalos: presencia y transferencia.
13. Formulario actual, preservado íntegramente.
14. Precios vigentes y datos de transferencia confirmados por la pareja.
15. Fotografía en blanco y negro y contactos reales.

## Datos confirmados
- Fecha: 26 de septiembre de 2027.
- Recepción: 15:00.
- Ceremonia: 16:00.
- Finalización: 23:00.
- Salón BOLGHERT.
- Dirección: Santiago Derqui 703, Villa Allende.
- Dress code: Elegante.
- Confirmación hasta el 11 de septiembre de 2027 (según la captura de referencia, confirmado por la pareja).
- Bebé 0-1 años: $0.
- Niño 2-10 años: $50.000.
- Adulto desde el comienzo: $130.000.
- Adulto después del almuerzo: $70.000.

## Criterios de aceptación
- Comparar cada sección con las capturas originales.
- Mantener las rutas y el funcionamiento de la confirmación.
- No sustituir dibujos originales por imágenes genéricas sin indicarlo.
- Responsive para escritorio y móvil.
- Respetar prefers-reduced-motion.
- Ejecutar npm run build.
- Publicar en el repositorio confirmado una vez superadas las verificaciones locales.

## Inspección visual verificada - 2026-10-28

### Método y evidencia
- La URL de Canva cargó en Google Chrome mediante Playwright CLI.
- Se capturaron los viewports iniciales en escritorio (1440 x 900) y móvil (390 x 844).
- Las capturas se conservaron temporalmente fuera del proyecto durante la inspección.
- El capturador de página completa solo devolvió el viewport: la publicación usa un contenedor de desplazamiento interno que esta herramienta no recorrió. No hay evidencia visual directa aún de las secciones posteriores al reproductor.

### Portada y transición
- Verificado en escritorio y móvil.
- La fotografía horizontal de la pareja ocupa la parte superior; en móvil muestra el anillo en primer plano.
- La imagen se desvanece progresivamente a blanco en el borde inferior, no a bordó oscuro.
- El sello dorado se superpone centrado sobre la transición entre fotografía y papel.
- En móvil hay ilustraciones lineales blancas superpuestas sobre la fotografía. Su contenido y posición exacta requieren una captura de mayor resolución antes de reproducirse.
- En escritorio el contenedor visible comienza con esquinas superiores redondeadas muy amplias.

### Cuenta regresiva y reproductor
- Verificados en móvil; el escritorio solo muestra el inicio de esta zona.
- El fondo es papel claro texturado.
- Bajo el sello aparece el nombre caligráfico bordó, con un ornamento vegetal a la izquierda y un anillo lineal a la derecha.
- La jerarquía textual visible es: "tiempo restante", "HASTA EL SÍ", contador grande con separadores de dos puntos y etiquetas "DÍAS", "HORAS", "MIN" y "SEG".
- El reproductor muestra el texto "Dale play para reproducir nuestra canción", controles en una línea y un ornamento de cuerda debajo. Sin un archivo de audio no se debe declarar funcional.

## Estado de implementación

- La carpeta de referencias indicada por la pareja contiene las imágenes usadas para el orden de secciones y la composición.
- La portada, cuenta regresiva, música, versículo, evento, relatos, confirmación, dress code, regalos, registro, precios, transferencia y contactos están implementados en componentes React, no como una captura aplanada.
- La ruta y el formulario de confirmación existentes se conservan.
- El reproductor oficial de YouTube usa la canción confirmada por la pareja, mantiene un solo reproductor entre rutas y comunica claramente el bloqueo de autoplay o los errores.
- Los títulos e imágenes se revelan una vez al entrar en pantalla; las pinzas pequeñas se mantienen sobre el borde superior de cada foto.
- La fecha límite y los datos de transferencia visibles en las capturas fueron confirmados por la pareja antes de integrarlos.
- Las fotos y ornamentos que ya se encontraban en `public/images/recuperados/originales/` se usan directamente; donde no existe el dibujo exacto de la captura, se señala en el inventario.
