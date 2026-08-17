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
--serif:'Bodoni MT','Didot',Georgia,'Times New Roman',serif;   /* títulos y nombres de mes */
--sans:'Segoe UI',system-ui,-apple-system,sans-serif;          /* todo lo demás */
```

Sin fuentes externas: no hay build, y una fuente por CDN es una petición de red que
puede fallar justo cuando alguien abre el link con mala señal.

El serif de alto contraste es lo que hace el trabajo de "formal y con estilo". Queda para
títulos de obra y nombres de mes. **Antes también llevaba los precios** —`S/ 148` en Bodoni se
leía como cifra considerada y no como dato de sistema—, pero el precio salió de pantalla con
el reenfoque a la obra.

| Uso | Regla |
|---|---|
| Nombre de la app | sans 12.5px, `letter-spacing:.24em`, mayúsculas, `--accent` |
| Nombre del mes | serif 22px / 1.1, capitalizado |
| Título de obra | serif 20px / 1.18 |
| Elenco | sans 12.5px / 1.5, color `--ink`; el "y N más" en `--ink3` |
| Sinopsis | sans 13.5px / 1.55, color `--ink2`, recortada a 3 líneas |
| Día de la tira | sans 9.5px mayúsculas sobre número sans 16px |
| Metadatos | sans 12.5px / 1.55, color `--ink2` |
| Encabezado de día y etiquetas de sección | sans 10.5px, `letter-spacing:.11em`, mayúsculas, `--ink3` |

Antes había tres niveles de título de obra (plan #1 grande, planes 2 y 3 chicos) porque
`puntuarFuncion` rankeaba y la composición tenía que **mostrar** que había ordenado. Con el
ranking retirado el orden lo manda la fecha, así que todas las tarjetas pesan igual y un solo
tamaño es lo correcto.

## Reglas de composición

1. **La tarjeta responde "¿qué obra es?", en ese orden: título, género y elenco, sinopsis.**
   El género abre la línea de metadatos porque es lo que más rápido engancha o descarta —
   "comedia" decide antes que la hora. El elenco va entero y visible: es el otro gancho.
   La sinopsis va tercera y recortada, porque es lo único que se lee y no se escanea.

   Acá vivía **el precio en serif de 24px**, que era la primera pregunta cuando la app
   contestaba "¿cuánto sale?". Salió de pantalla junto con el gasto de los restaurantes.
   Si alguna vez vuelve, vuelve **debajo** de la sinopsis y no encima: el orden de esta lista
   es el orden de la decisión.
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
│                          │  ‹  agosto 2026  ›  │
│                          │ [17][18][19][20]→   │  .calendario-caja
│          MAPA            │  Ver el mes completo│  (fija, ~115px)
│    (alto completo)       ├─────────────────────┤
│                          │  LUNES 17        ▲  │
│                          │  [tarjeta]       │  │  .lista
│                          │  MARTES 18    scroll│  (lo único que scrollea)
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
- **La caja del calendario mide ~115px cerrada, no 340px.** Antes eran la barra de mes más una
  grilla de 42 celdas: 264px fijos que en una ventana de 700px de alto dejaban a la lista con
  ~260px, o sea dos tarjetas y media. Ese era el pendiente "presupuesto vertical", y se resolvió
  cambiando la grilla por una **tira horizontal de días** con el mes completo plegado detrás de
  `<details class="mes-completo">`.

  Lo que **no** se hizo, y es la parte importante: no se achicaron las celdas. Un chip mide 44px
  como manda la regla de área táctil. Lo que se achicó es el número de filas, seis a una.
  Abierto, el mes recupera sus 42 celdas y la caja se limita a `max-height:46vh` con scroll
  propio, o empujaría la lista fuera de la pantalla.

## La tira de días

```
‹        agosto 2026        ›
┌───┐┌───┐┌───┐┌───┐┌───┐
│LUN││MAR││MIÉ││JUE││VIE│  →  scroll horizontal
│ 17││ 18││ 19││ 20││ 21│
│ • ││   ││ • ││ • ││ • │     el punto = hay función
└───┘└───┘└───┘└───┘└───┘
Ver el mes completo
```

- **Lleva todos los días que quedan del mes, no solo los que tienen función.** Los huecos son
  información: sin ellos, tres días seguidos de teatro se verían igual que tres salteados.
- **Un día sin función no es un botón**, es un `<span>`. No hay sección a la que saltar, y un
  control que al tocarlo no hace nada miente sobre lo que ofrece.
- **Sin una sola función en el mes no hay tira.** Es la misma regla que ya seguía el mapa. En
  octubre se veían 31 chips muertos encima del cartel "nada cargado en octubre".
- El día de hoy va en `--accent` con borde de acento. **No se usa el ámbar del semáforo**, que
  es la regla de la paleta.

### El mapa base: CARTO Positron

Las teselas de OpenStreetMap eran el único bloque de verde y azul saturado en una pantalla de
rosa pastel y serif, y se corregían con un filtro sobre `.leaflet-tile-pane`. **Ese filtro se
retiró**: Positron ya es un mapa base gris claro y de bajo contraste, hecho para que lo que se
dibuja encima resalte, y filtrarlo solo lo lavaba más.

Si algún día vuelve un mapa base saturado, el filtro vuelve en el *pane* de teselas y **nunca**
en el contenedor: Leaflet separa teselas, marcadores, popups y controles en capas distintas, así
que teñir solo la de abajo deja los pines rosa y los contrastes ya verificados sin tocar.

**El pin pasó de 11 a 20px** de diámetro, con anillo blanco de 3px. A 11 el círculo se perdía
sobre las teselas y había que buscarlo. El número está duplicado en la constante `PIN` de
`js/mapa.js`, de donde sale el `iconAnchor`: si los dos se separan, cada teatro queda corrido
de su coordenada real y el mapa igual se ve bien.

La tarjeta que abre un pin —teatro, obra, género, elenco, fechas y horarios, y un "Ver más" que
lleva a la lista— usa la superficie y la tipografía de las tarjetas de función. **El género y el
elenco aparecen solo si la fuente los publicó:** `tipo: "otro"` y `elenco: []` significan que no
lo dijo nadie, y rellenarlos sería inventar.

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
  el defecto que más se repite, así que medí antes de dar por buena una grilla. Cuando hubo que
  achicar el calendario, la tentación fue bajar la celda a 36px; se rechazó y se cambió la
  forma en su lugar. **Ganar espacio nunca se paga con el área táctil.**
- **El "seguir leyendo" de la sinopsis lleva `aria-expanded`** y cambia su propio texto a
  "Mostrar menos". Y solo existe cuando hay algo que desplegar: una sinopsis corta se muestra
  entera, sin botón y sin recorte, para que nunca quede texto oculto sin manera de abrirlo.
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
  datos a la derecha en pares etiqueta/valor). **El precio ya no va**: salió de la pantalla y
  no puede volver por la puerta de atrás en una imagen que además se reenvía durante semanas.
  Su lugar lo ocupan género y elenco.
- Pie obligatorio en dos partes: **crédito del afiche** al teatro de origen, y **fecha de
  verificación**. Lo primero es la mitigación de derechos de autor; lo segundo evita que una
  imagen reenviada semanas después afirme una función que ya no existe.

## Pendientes conocidos

| Falta | Estado |
|---|---|
| Layout de escritorio | **Hecho.** Dos columnas desde 900×600: mapa a alto completo a la izquierda, calendario fijo y lista con scroll propio a la derecha. Ver la sección de arriba. Verificado en navegador a 1041×703 y, bajando el breakpoint a propósito, en el repliegue a una columna. |
| Estado de carga | **Hecho.** `.cargando` en `index.html` y `styles.css`. |
| Estado de error visual | **Hecho.** `.error` con fondo y marca propios en `styles.css`. |
| Estado de mes vacío | **Hecho y ALCANZABLE.** `.sin-resultados` se ve navegando a un mes sin funciones. Dejó de ser inalcanzable porque `rangoNavegable()` permite un mes más allá del rango cargado — exactamente para que este estado exista de verdad. Verificado en navegador. |
| Mapa | **Hecho, con un límite geométrico atenuado.** Banda de 260px en móvil, columna a alto completo en escritorio; pines de 20px dibujados con CSS, nombre al pasar por encima y tarjeta al tocar. Mapa base CARTO Positron, sin filtro. **Los dos modos de falla verificados provocándolos de verdad:** con el CDN de Leaflet caído la banda se va a 0px, la columna se retira y la lista queda entera; con solo las teselas caídas la capa cambia sola a OpenStreetMap y la atribución lo refleja. **Los tres teatros de Miraflores estaban a 3px unos de otros** en la banda: el conjunto abarca 11,7 km (Cercado a Barranco) y esos tres están a 300 m, una razón de 39 a 1. En los ~620px de la columna de escritorio esa distancia pasa a unos 15px. La lista es la navegación real; el mapa contesta "¿está cerca?". |
| Presupuesto vertical | **Hecho.** Era el pendiente más viejo. La grilla de 42 celdas pasó a una tira horizontal con el mes plegado detrás de `<details>`: la caja del calendario cayó de ~340px a ~115px en escritorio y ~161px en móvil. Medido en navegador a 386×840 y a 1041×703. En móvil la primera tarjeta ahora empieza a 534px en vez de ~706px. **No se tocó el área táctil**: los chips siguen en 44px. |
| Calendario del mes | **Hecho.** Tira horizontal de los días que quedan del mes; las 42 celdas fijas siguen existiendo, plegadas en "Ver el mes completo". Lunes primero, punto en los días con función. |
| Sinopsis, género y elenco | **Hecho.** En la tarjeta y en el popup del mapa. Cobertura real: 12/12 con sinopsis, 8/12 con género, 8/12 con elenco; los huecos son huecos declarados y la línea desaparece entera en vez de decir "otro". |
| Estado "guardado" | **Pendiente, y hay código muerto.** `alternarGuardado()` y `leerGuardados()` existen en `datos.js` pero la interfaz nunca los llama. |
| Primera vez | **Parcial.** La app ya se presenta con su nombre en la cabecera, y el mapa avisa mientras carga. Sigue sin haber nada que explique qué es la pantalla. |
| Marca del reloj | **Pendiente.** La del estado vencido se lee más como una L que como un reloj. |
| Afiches de obras | **Pendiente, y hoy no hay ninguno.** `imagen_local` está en `null` en las 12 obras, así que la regla "los afiches mandan" no tiene nada que gobernar todavía. Con la sinopsis en pantalla la tarjeta ya no depende de ellos para tener algo que decir, así que bajó de prioridad. |
| Filtros y tarjeta compartible | **Pendiente.** Diseñados y aprobados en las maquetas, sin implementar. El filtro de presupuesto se cae del plan junto con el precio; quedan **género** (8 obras con dato) y distrito. |
