# DESIGN.md — teatro

Sistema de diseño derivado de `/plan-design-review` el 2026-08-16.
Maquetas de referencia: `~/.gstack/projects/teatro/designs/teatro-v1-20260816/`

**El brief:** rosa pastel, elegante y formal, con criterio profesional. Nada decorativo.

Traducción a reglas: rosa que no sea infantil, serif de alto contraste, texto cálido en
vez de negro, y restricción en todo lo demás. **Aquí la elegancia es cuánto quitas.**

---

## Paleta

```css
:root{
  --bg:      #fdf8f7;  /* fondo, blanco rosado */
  --surface: #ffffff;  /* tarjetas */
  --ink:     #3a2a2e;  /* texto principal, borgoña oscuro. NUNCA negro puro */
  --ink2:    #7d666c;  /* texto secundario   — 5.0:1 sobre --bg, pasa AA */
  --ink3:    #7f6a70;  /* texto terciario    — 4.6:1 sobre --bg, pasa AA */
  --accent:  #a35267;  /* rosa vino: acciones, badges, acentos */
  --accent-bg:#f7e9ea; /* fondo del bloque "por qué es el #1" */
  --line:    #f0e2e0;  /* separadores */
  --hair:    #e6d3d0;  /* bordes finos */
}
```

**Nunca uses `#a08e93` para texto.** Fue el gris original y mide 2.94:1 sobre el fondo:
falla WCAG AA, que exige 4.5:1. Por eso `--ink3` es #7f6a70.

### El semáforo de confianza es intocable

Estos tres colores comunican fiabilidad del dato y **no pueden reusarse para decoración**.
Si el acento de la app fuera ámbar, el aviso de "verificar antes de ir" dejaría de leerse
como aviso. Por eso el acento es rosa vino y no dorado.

```css
--ok:  #4f8a63;  /* verde salvia — confirmado hace menos de 7 días */
--mid: #c28b3c;  /* ámbar        — confirmado hace 7 a 21 días, o "probable" */
--no:  #a3969a;  /* gris cálido  — sin verificar */
```

## Tipografía

```css
--serif:'Bodoni MT','Didot',Georgia,'Times New Roman',serif;   /* títulos y precios */
--sans:'Segoe UI',system-ui,-apple-system,sans-serif;          /* todo lo demás */
```

Sin fuentes externas: no hay build, y una fuente por CDN es una petición de red que
puede fallar justo cuando alguien abre el link con mala señal.

El serif de alto contraste es lo que hace el trabajo de "formal y con estilo". **Los
precios van en serif, no en sans**: `S/ 148` en Bodoni se lee como una cifra considerada
y no como un dato de sistema.

| Uso | Regla |
|---|---|
| Título de pantalla | serif 30px / 1.1 |
| Título de obra, plan #1 | serif 23px / 1.13 |
| Título de obra, planes 2 y 3 | serif 17px / 1.2 |
| Precio destacado | serif 27px |
| Metadatos | sans 12.5px / 1.55, color `--ink2` |
| Etiquetas de sección | sans 10.5px, `letter-spacing:.11em`, mayúsculas, `--ink3` |

## Reglas de composición

1. **El precio es escaneable sin leer.** Es la primera pregunta de cualquiera que mira una
   cartelera. Va en serif grande y muestra el rango publicado tal cual: `S/ 30 – 50`,
   `desde S/ 35`. Nunca multiplicado por dos, o deja de coincidir con Teleticket.
2. **Los afiches mandan** cuando existan. Son el único activo visual del proyecto. Nunca
   por debajo de 56px de ancho.
3. **Nada de emoji.** Renderizan distinto en cada celular y rompen la tipografía. Los
   iconos se dibujan con CSS — incluidos los pines del mapa (`.pin-teatro`).
4. **Los tres estados de vacío son visualmente distintos.** Mes sin funciones usa el rosa
   normal y manda a las flechas. Cartelera vencida cambia a fondo cálido y marca ámbar.
   Fallo de carga tiene su propio fondo y marca roja. Si se parecieran, el modelo de
   confianza quedaría anulado.
5. **El mapa es opcional, no estructural.** Si Leaflet no carga, su banda desaparece entera
   y la lista sube: nunca un rectángulo gris esperando. El mapa nunca lleva información que
   no esté también en la lista.
6. **La barra de mes es lo único pegajoso de nivel superior.** Al scrollear, mapa y grilla
   salen y ella queda a 44px. Los encabezados de día se pegan debajo, a `top: var(--tap)`.

### Decisión revisada: el mapa vuelve a la pantalla principal

El diseño original lo tenía de protagonista; la revisión cruzada lo movió al detalle,
argumentando que el mapa cobra geocodificación y Leaflet antes de probar lo difícil.
**Ese peaje ya se pagó**: las coordenadas existen y están verificadas. Con el eje del producto
movido de "3 planes" a "la cartelera del mes", el mapa contesta la pregunta que la lista no
puede — *"¿está cerca?"* — sin que haya que abrir nada.

Se conserva lo bueno de la decisión anterior: Leaflet sigue entrando por `import()` dinámico y
su fallo no toca el resto de la pantalla.

## Accesibilidad, verificada no supuesta

- Todo texto sobre `--bg` mide **4.5:1 o más**. Comprobado por cálculo, no a ojo.
- **Área táctil mínima 44×44px.** Los chips de filtro estaban en 33px y suben a 44.
- El estado de confianza **nunca depende solo del color**: el punto siempre va con texto
  ("confirmado hace 12 días", "cena sin precio verificado").
- Contraste a verificar cuando exista código: foco de teclado visible en todo lo tocable.

## La tarjeta compartible

**Ficha, no invitación.** Decisión explícita: la tarjeta lleva solo información bien
compuesta. El mensaje personal lo escribe él al mandarla por WhatsApp. Una frase fija
impresa en la imagen competiría con eso y se gastaría de tanto repetirla.

- **1080×1080, cuadrada.** No 4:5. El cuadrado nunca se recorta en la vista previa de
  WhatsApp, y cerrar el formato elimina el espacio muerto en vez de rellenarlo.
- Estructura: fecha, título en serif grande, luego dos columnas (afiche a la izquierda,
  datos a la derecha en pares etiqueta/valor), precio abajo a la derecha.
- Pie obligatorio en dos partes: **crédito del afiche** al teatro de origen, y **fecha de
  verificación de precios**. Lo primero es la mitigación de derechos de autor; lo segundo
  evita que una imagen reenviada semanas después mienta sobre el precio.

## Pendientes conocidos

| Falta | Estado |
|---|---|
| Layout de escritorio | **Pendiente.** Solo se diseñó 390px. A 1440px hay que decidir qué pasa. |
| Estado de carga | **Hecho.** `.cargando` en `index.html` y `styles.css`. |
| Estado de error visual | **Hecho.** `.error` con fondo y marca propios en `styles.css`. |
| Estado de mes vacío | **Hecho y ALCANZABLE.** `.sin-resultados` se ve navegando a un mes sin funciones. Dejó de ser inalcanzable porque `rangoNavegable()` permite un mes más allá del rango cargado — exactamente para que este estado exista de verdad. Verificado en navegador. |
| Mapa | **Hecho, con un límite geométrico conocido.** Banda de 260px, pines dibujados con CSS y nombre al pasar por encima. Caída del CDN verificada: la banda se va a 0px y la lista queda entera. **Los tres teatros de Miraflores quedan a 3px unos de otros** y no se pueden tocar por separado sin acercar el mapa: el conjunto abarca 11,7 km (Cercado a Barranco) y esos tres están a 300 m — una razón de 39 a 1 que ninguna altura de banda resuelve. La lista de abajo es la navegación real; el mapa contesta "¿está cerca?". |
| Presupuesto vertical | **A revisar.** La cabecera (mapa 260 + barra 44 + calendario 319) suma **625px**. En un celular de 844px eso deja ver el encabezado del día y apenas el borde de la primera tarjeta. Es coherente con una app que es un calendario, pero conviene mirarlo con datos de un mes completo antes de darlo por bueno. |
| Calendario del mes | **Hecho.** 42 celdas fijas, lunes primero, punto en los días con función. |
| Estado "guardado" | **Pendiente, y hay código muerto.** `alternarGuardado()` y `leerGuardados()` existen en `datos.js` pero la interfaz nunca los llama. |
| Primera vez | **Pendiente.** Qué ve alguien que abre la app sin saber qué es. |
| Marca del reloj | **Pendiente.** La del estado vencido se lee más como una L que como un reloj. |
| Afiches de obras | **Pendiente, y hoy no hay ninguno.** `imagen_local` está en `null` en las 5 obras, así que la regla 2 de composición no tiene nada que gobernar todavía. |
| Filtros y tarjeta compartible | **Pendiente.** Diseñados y aprobados en las maquetas, sin implementar. |
