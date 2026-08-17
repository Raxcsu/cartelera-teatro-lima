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
| Nombre de la app | sans 12.5px, `letter-spacing:.24em`, mayúsculas, `--accent` |
| Nombre del mes | serif 22px / 1.1, capitalizado |
| Título de obra | serif 20px / 1.18 |
| Precio de entrada | serif 24px / 1 |
| Metadatos | sans 12.5px / 1.55, color `--ink2` |
| Encabezado de día y etiquetas de sección | sans 10.5px, `letter-spacing:.11em`, mayúsculas, `--ink3` |

Antes había tres niveles de título de obra (plan #1 grande, planes 2 y 3 chicos) porque
`puntuarFuncion` rankeaba y la composición tenía que **mostrar** que había ordenado. Con el
ranking retirado el orden lo manda la fecha, así que todas las tarjetas pesan igual y un solo
tamaño es lo correcto.

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
5. **El mapa es opcional, no estructural.** Si Leaflet no carga, su banda desaparece entera y
   la lista sube; en escritorio se retira además su columna del grid, porque esconder solo la
   caja dejaría media pantalla vacía. Mientras carga, la caja dice "Cargando el mapa…": nunca
   un rectángulo esperando sin explicación. El mapa nunca lleva información que no esté también
   en la lista, y muestra el mismo recorte que ella —de hoy en adelante—, o un pin llevaría a
   una tarjeta que no existe.
6. **Lo pegajoso depende de quién scrollea.** En móvil scrollea la página: la barra de mes
   queda arriba a 44px y los encabezados de día debajo, a `top: var(--tap)`. En escritorio
   scrollea solo la lista: la barra de mes vive dentro de la caja del calendario, que no se
   mueve, y los encabezados de día se pegan a `top: 0` dentro de la lista.

## Escritorio: dos columnas desde 900px

Hasta acá solo existían 390px. A 1440px se veía una columna de 430px centrada en un mar de
fondo rosa, y el mapa encajonado en una banda donde los teatros de Miraflores caían a 3px unos
de otros.

```
┌────────────────────────────────────────────────┐
│              THEATER WITH HER ♥                │  <header> en index.html
├──────────────────────────┬─────────────────────┤
│                          │  ‹  agosto  ›       │
│                          │  L M M J V S D      │  .calendario-caja
│          MAPA            │  [grilla 42 celdas] │  (fija)
│    (alto completo)       ├─────────────────────┤
│                          │  SÁBADO 22       ▲  │
│                          │  [tarjeta]       │  │  .lista
│                          │  DOMINGO 23   scroll│  (lo único que scrollea)
└──────────────────────────┴─────────────────────┘
   minmax(0,1.15fr)            minmax(0,420px)
```

- **El breakpoint pide alto además de ancho:** `(min-width:900px) and (min-height:600px)`. En
  una ventana ancha y baja, un layout de `100dvh` deja la lista sin sitio y la columna de
  siempre es mejor respuesta.
- **La página no scrollea; la lista sí.** El mapa queda siempre a la vista, que es la razón de
  ponerlo en su propia columna.
- **Sin mapa, la columna se retira entera** y la que queda se acota a 620px y se centra. Un mes
  de 42 celdas a 1300px de ancho no se lee, se recorre. Pasa de verdad y no solo si se cae el
  CDN: un mes sin funciones no tiene un solo pin, así que tampoco tiene mapa.
- **La grilla del mes son 264px fijos** (42 celdas × 44px de área táctil) y no se negocian. Con
  eso, en una ventana de 700px de alto la lista se queda con unos 260px: dos tarjetas y media.
  Es el precio de tener calendario y mapa a la vez, y es coherente con una app que es un
  calendario, pero conviene mirarlo de nuevo cuando entren los datos del mes completo.

### El tinte de las teselas

Las teselas de OpenStreetMap son el único bloque de verde y azul saturado en una pantalla de
rosa pastel y serif. Se corrigen con un filtro, **no con colores nuevos**: la regla de la paleta
sigue intacta.

```css
.leaflet-tile-pane{filter:grayscale(.5) sepia(.2) saturate(.9) brightness(1.06) contrast(.94)}
@media (prefers-contrast:more){.leaflet-tile-pane{filter:none}}
```

Va en el *pane* de teselas y no en el contenedor: Leaflet separa teselas, marcadores, popups y
controles en capas distintas, así que teñir solo la de abajo deja los pines rosa y los
contrastes ya verificados sin tocar. Si el sistema pide más contraste, el filtro se retira: el
mapa se lee antes que combina.

La tarjeta que abre un pin —teatro, obra, fechas y horarios, y un "Ver más" que lleva a la
lista— usa la superficie y la tipografía de las tarjetas de función. **El género aparece solo si
la fuente lo publicó:** `tipo: "otro"` significa que no lo dijo nadie, y rellenarlo sería
inventar.

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
- **Área táctil mínima 44×44px**, vía `--tap`. Los chips de filtro estaban en 33px y suben a 44.
  Las celdas del calendario cayeron en el mismo error (estaban en 34px) y también suben: es
  el defecto que más se repite, así que medí antes de dar por buena una grilla.
- El estado de confianza **nunca depende solo del color**: el punto siempre va con texto
  ("verificar antes de ir", "confirmado hace 12 días").
- **Foco de teclado visible en todo lo tocable.** Implementado: `:focus-visible` con contorno
  de acento y `outline-offset`, en `styles.css`.
- El movimiento reducido se respeta por media query, y el scroll suave se declara en CSS a
  propósito: pedirlo desde JS no desplaza nada con las animaciones del sistema apagadas.

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
| Layout de escritorio | **Hecho.** Dos columnas desde 900×600: mapa a alto completo a la izquierda, calendario fijo y lista con scroll propio a la derecha. Ver la sección de arriba. Verificado en navegador a 1041×703 y, bajando el breakpoint a propósito, en el repliegue a una columna. |
| Estado de carga | **Hecho.** `.cargando` en `index.html` y `styles.css`. |
| Estado de error visual | **Hecho.** `.error` con fondo y marca propios en `styles.css`. |
| Estado de mes vacío | **Hecho y ALCANZABLE.** `.sin-resultados` se ve navegando a un mes sin funciones. Dejó de ser inalcanzable porque `rangoNavegable()` permite un mes más allá del rango cargado — exactamente para que este estado exista de verdad. Verificado en navegador. |
| Mapa | **Hecho, con un límite geométrico atenuado.** Banda de 260px en móvil, columna a alto completo en escritorio; pines dibujados con CSS, nombre al pasar por encima y tarjeta al tocar. Teselas teñidas por filtro. Caída del CDN verificada: la banda se va a 0px, la columna se retira y la lista queda entera. **Los tres teatros de Miraflores estaban a 3px unos de otros** en la banda: el conjunto abarca 11,7 km (Cercado a Barranco) y esos tres están a 300 m, una razón de 39 a 1. En los ~620px de la columna de escritorio esa distancia pasa a unos 15px, o sea que se pueden tocar por separado; en móvil el límite sigue igual. La lista es la navegación real; el mapa contesta "¿está cerca?". |
| Presupuesto vertical | **A revisar, en las dos pantallas.** En móvil la cabecera (título 32 + mapa 260 + barra 44 + calendario 319) pasa de **650px**: en un celular de 844px se ve el encabezado del día y apenas el borde de la primera tarjeta. En escritorio el problema cambia de forma pero no desaparece: la caja del calendario se lleva ~350px de la columna derecha y a 700px de ventana la lista se queda con ~260px. Conviene mirarlo con datos de un mes completo antes de darlo por bueno. |
| Calendario del mes | **Hecho.** 42 celdas fijas, lunes primero, punto en los días con función. |
| Estado "guardado" | **Pendiente, y hay código muerto.** `alternarGuardado()` y `leerGuardados()` existen en `datos.js` pero la interfaz nunca los llama. |
| Primera vez | **Parcial.** La app ya se presenta con su nombre en la cabecera, y el mapa avisa mientras carga. Sigue sin haber nada que explique qué es la pantalla. |
| Marca del reloj | **Pendiente.** La del estado vencido se lee más como una L que como un reloj. |
| Afiches de obras | **Pendiente, y hoy no hay ninguno.** `imagen_local` está en `null` en las 5 obras, así que la regla 2 de composición no tiene nada que gobernar todavía. |
| Filtros y tarjeta compartible | **Pendiente.** Diseñados y aprobados en las maquetas, sin implementar. |
