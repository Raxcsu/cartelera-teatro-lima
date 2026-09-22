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
| Pestaña de sección | sans 10.5px, `letter-spacing:.08em`, mayúsculas, `--ink3`; la activa en `--accent` con borde inferior de 2px |
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
│   [Cartelera] Escala astronómica  Una pregunta │  <nav class="pestanas">
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

### El mapa base: OpenStreetMap

Pasó por dos proveedores y volvió al primero. OSM era el único bloque de verde y azul saturado
en una pantalla de rosa pastel y serif, y se corregía con un filtro sobre `.leaflet-tile-pane`.
Se probó CARTO Positron, que ya es gris claro y de bajo contraste, y con él el filtro se retiró
porque solo lo lavaba más. Hoy el mapa base **volvió a OpenStreetMap y el filtro no volvió con
él**: una segunda dependencia externa que hay que acreditar aparte no se paga solo por bajar la
saturación, y el pin de 20px con anillo blanco ya resuelve la legibilidad que el filtro
buscaba.

Si algún día se decide corregir la saturación, el filtro va en el *pane* de teselas y **nunca**
en el contenedor: Leaflet separa teselas, marcadores, popups y controles en capas distintas, así
que teñir solo la de abajo deja los pines rosa y los contrastes ya verificados sin tocar.

**El modo de falla de las teselas cambió, y es una decisión de diseño.** Antes, seis
`tileerror` seguidos cambiaban la capa al otro proveedor. Ahora avisan a `vista.js`, que retira
el mapa entero: destruye la instancia, esconde la caja y aplica `sin-mapa`. Degradar a la lista
completa es más honesto que degradar a un segundo proveedor, que además puede estar caído por
el mismo motivo. La regla de fondo no cambió: **un rectángulo gris con pines flotando sobre
nada es peor que no tener mapa.**

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

## Las otras tres vistas

La app dejó de ser una sola pantalla: la cabecera lleva cuatro pestañas y `app.js` despacha por
hash. Las tres vistas nuevas son personales y no producto, pero se rigen por la misma paleta y
las mismas reglas de área táctil.

**Las pestañas.** Sans en mayúsculas, en la familia del nombre de la app pero un escalón por
debajo: `10.5px` con `letter-spacing:.08em` contra los `12.5px` / `.24em` del `<h1>`, para que
la navegación no compita con el nombre. Alto `44px` por la regla de área táctil. La activa
lleva `aria-current="page"`, el acento y un borde inferior de 2px; las otras van en `--ink3`.
Por debajo de 400px y de 340px el padding se reduce en dos escalones, en vez de achicar la
letra o envolver a dos líneas.

**Con la cuarta pestaña la barra pasó a scrollear, y las dos alternativas se descartaron por
motivos que conviene dejar escritos.** Bajar la celda táctil está prohibido por la regla de
44px. Partir en dos filas engorda la cabecera unos 44px, justo donde el calendario peleó por
ganar 180px. Queda el scroll horizontal, cuyo costo es real: esconde destinos enteros sin
decirlo. Lo compensan los degradados de ambos bordes —`.desborda-antes` y
`.desborda-despues`, puestos desde `app.js`—, que aparecen solo si queda contenido oculto en
ese lado. La barra se centra con
`justify-content:safe center`; sin soporte, las pestañas quedan a la izquierda, que es una
diferencia cosmética y no un layout roto. El anillo de foco de las pestañas va con
`outline-offset:-2px` porque un contenedor con scroll recorta en su caja de relleno y el
anillo de 2px hacia afuera se perdía.

**La escala astronómica** es una lectura, así que compone como una lectura: una cifra por
bloque en `<dl>`, el kicker de sección en 10px con `letter-spacing`, y la fórmula en serif
grande (`clamp(44px,7vw,58px)`) porque es el remate visual del argumento. En escritorio se
parte en dos columnas —resumen a la izquierda, PDF embebido a la derecha— y **la página no
scrollea**: `.app.escala` lleva `overflow:hidden` y el `<object>` del PDF se estira con `flex`
y scrollea por dentro.

**La barra de scroll se esconde en esta ruta, y es la única del proyecto donde pasa.**
`html:has(.app.escala)` la retira para que la mesa de lectura de escritorio no tenga un canal
vertical al lado de un PDF que ya trae el suyo. Ojo con el efecto en móvil: ahí `.app.escala`
**no** lleva `overflow:hidden`, así que la página sí se desplaza — con la barra escondida. Si
alguna vez alguien no encuentra el final del texto en el celular, empezá por acá.

**La invitación define su propia paleta, y eso es la excepción que confirma la regla.**

```css
.app.pregunta, .petalos{
  --flor-1:#e3b9c1; --flor-2:#c77e90; --flor-3:#a35267; --flor-4:#854052;
}
.app.pregunta{ --hoja:#93a38c; --hoja-2:#7c8f77; }
```

Los cuatro rosas salen de la familia del acento (`--flor-3` **es** `--accent`). El verde es
**propio y no `--ok`**: ese es el verde del semáforo de confianza y la paleta prohíbe reusarlo
para decorar, que es la misma razón por la que el acento es rosa vino y no dorado. Todo va
declarado en `.app.pregunta`, no en `:root`, para que un ramo no pueda teñir la cartelera.

**Es la primera pantalla del proyecto con animación, y toda ella vive dentro de
`prefers-reduced-motion: no-preference`.** No es una animación atenuada: con el movimiento
apagado el ramo aparece **entero y quieto**. Un ramo que no brota es aceptable; un ramo que no
está es el peor fallo posible de esta pantalla. La lluvia de pétalos directamente no ocurre.

El SVG del ramo no tiene `viewBox` fijo: se calcula del contenido, porque el ramo se ensancha
al crecer y un marco fijo le dejaría un margen distinto cada día. Por eso el origen de la
animación viaja como custom property (`--origen-x`/`--origen-y`) desde `js/pregunta.js` en vez
de estar copiado en el CSS — un `transform-origin` fijo apuntaría a otro sitio cada día y las
flores brotarían del aire.

**Cuatro keyframes y dos juegos de custom properties escritas desde JS.** Los keyframes son
`brotar` (el ramo al entrar), `rebrotar` (la celebración; es propio y no reusa `brotar` porque
cambiar la duración no reinicia una animación que ya terminó), `aparecer` (lazo y mensaje
final) y `caer` (los pétalos). El escalonado de los tallos entra por `--i`; cada pétalo recibe
`--dur`, `--ret`, `--giro` y `--vaiven`. **Ninguna de las seis se declara en el CSS**: son
valores por elemento, y declararlas ahí sería fijar un solo ramo y una sola lluvia.

**Flores amarillas es la única pantalla oscura del proyecto, y es una excepción deliberada.**
Son flores encendidas: sin cielo negro no se encienden. La excepción se contiene sola porque
la vista entera vive dentro de una caja con `border-radius:14px` bajo la cabecera, que sigue
siendo clara; la app no cambia de tema, cambia de pantalla.

**Los colores del cielo NO están en `styles.css`.** Los pinta un `<canvas>`, así que viven en
la constante `CIELO` de `js/flores.js`, y de ahí sale también el fondo de la caja —lo escribe
el JS— para que el mismo negro no quede en dos archivos que después hay que mover juntos. Es
la misma precaución que `PIN` contra el `width` de `.pin-teatro i`. En CSS queda solo el DOM:
encabezado, controles, diálogo y pista, con las tintas claras declaradas en `.app.flores` y
nunca en `:root`.

```js
oro: '#ffd75d', oroClaro: '#fff08a', oroHondo: '#e49d0a',   // el contenido
rosa: '#c77e90', corazon: '#d98fa0',                        // familia del acento
tallo: '#55741c', hoja: '#6e9527',                          // verde PROPIO, no --ok
```

Los dorados se quedan porque la vista se llama flores amarillas: son el tema, no decoración.
El violeta y el azul del original se fueron; el frío de la galaxia es ahora el rosa de la
familia del acento, el mismo de la invitación. El verde de las hojas es propio y **no `--ok`**,
por la misma regla de siempre: el verde del semáforo no decora.

**El alto del cielo se mide, no se declara.** Ocupa lo que queda bajo la cabecera, y eso no se
puede escribir en CSS sin un `:has()` que sostenga el layout — y la regla dice que `:has()`
puede fallar en cosmética, nunca en estructura. Lo mide `js/flores.js` en el mismo handler de
`resize` que ya necesita el canvas. El `min-height:300px` del CSS es el respaldo del instante
previo a esa medida.

**Cada flor es contenido, no una coordenada secreta del canvas.** Sobre las seis posiciones
hay botones DOM de 44×44px y sobre el corazón otro control disponible desde el inicio. En
escritorio los títulos acompañan a las flores; por debajo de 700px solo aparece una leyenda al
enfocar o tocar, para no tapar el cielo. Todos abren el mismo `<dialog>`: papel marfil, borde
dorado, cierre por botón o Escape y foco devuelto al control que lo abrió. El texto se coloca
con `textContent`; no hay rotación automática ni `aria-live` anunciando cambios no pedidos.

**Las seis flores rodean el corazón, y no están exactamente sobre los brazos.** Cada una lleva
un `desvio` angular que la corre de su brazo hasta su sitio en la composición. Puestas
estrictamente sobre dos brazos, seis flores caen en dos racimos de tres con dos cuadrantes
vacíos, y el corazón queda disputado. La jerarquía manda sobre la fidelidad geométrica: el
brazo sugiere de dónde sale la flor, el polvo ya lo dice, y la posición sirve a la lectura.

**El corazón tiene que ganar la primera mirada.** Es el control que abre la carta, así que
todo lo demás le cede el centro. Su blanco táctil es transparente en reposo —un anillo encima
le cortaba la silueta— y lo que hace de afordance es el latido, con amplitud alta a propósito,
más la pista que lo nombra. En un teléfono no hay hover que lo revele: si alguna vez se calma
ese latido, hay que poner otra cosa en su lugar.

**El canvas no es una dependencia del contenido.** Si no entrega un contexto 2D se oculta y la
caja pasa a una lista oscura con los seis mensajes y la carta. La galaxia tiene **dos brazos
espirales de verdad** —antes eran cuatro que se solapaban hasta formar un disco uniforme con
anillos que se leían como un átomo— y una entrada escalonada que termina antes de 1,4s. Gira
**rígida**: la rotación diferencial es correcta en física y enrolla los brazos hasta borrarlos.
Sus semillas se calculan una vez al sembrar —no 126 veces por cuadro—, cada grano guarda su
radio y su ángulo base para que el bucle no asigne ni un objeto por cuadro, las chispas se
limitan a 240 y los cambios de tamaño se agrupan en un solo `requestAnimationFrame`; el DPR
sigue topado en 2.

**El aplanado del disco se adapta a la caja, y ese número no es decorativo.** Vale 0,58 en una
caja ancha (la galaxia de canto) y sube hasta 0,95 en una angosta y alta (casi de frente). Con
0,58 fijo, en un teléfono el disco medía 316×174 dentro de una caja de 556 de alto: el universo
ocupaba un tercio de la pantalla y el resto era negro. Medido, no estimado.

**La geometría vive en `js/cielo.js` y está probada.** Es puro —entran y salen números— y no
está en `logica.js` a propósito: ese módulo es lógica de negocio. La galaxia estuvo rota en la
única capa que nadie lee, y tres rondas de revisión sobre el texto no lo vieron. Las reglas que
no se ven leyendo están en "cosas que parecen bugs y no lo son" de `CLAUDE.md`.

El alfa de los girasoles se **declara** en `0,62` dentro de `girasol()`: opacos quedan de
calcomanía sobre el cielo, y heredados del último punto dibujado salían fantasmales — pasó, y
se vio como flores amarillas sin amarillo. El resplandor del corazón repite ese reset por el
mismo motivo: se dibuja justo después de las estrellas, que dejan el alfa sucio.

**El tamaño de las flores se mide contra el disco, no contra `escala`.** Las dos medidas
divergen 1,7× entre escritorio y móvil, así que con `escala` las flores pesaban 1,7× más
dentro del cuadro en un teléfono: "flores gigantes, universo chico" volviendo por la puerta de
atrás. Y el recorte que las mantiene dentro de la caja usa la extensión **real** del dibujo
(`FLOR_EXT`), no un círculo: el tallo baja hasta `tam*2.1` y tratarlo como radio `tam`
subestimaba el alto por más del doble.

**Con el movimiento apagado el cielo se dibuja una vez y se queda quieto**, entero. Es la
misma regla del ramo: una galaxia que no gira es aceptable, una galaxia que no está es el peor
fallo de esta pantalla. Por eso `medir()` vuelve a dibujar ese cuadro al redimensionar; sin
eso, girar el teléfono dejaba el cielo en blanco. El `MediaQueryList` se escucha durante la
sesión: al activar movimiento reducido se detiene el bucle, se borran las chispas y se dibuja
el estado final; al desactivarlo se reanuda sin repetir la entrada.

## Accesibilidad, verificada no supuesta

- Todo texto sobre `--bg` mide **4.5:1 o más**. Comprobado por cálculo, no a ojo.
- **Área táctil mínima 44×44px**, vía `--tap`. Se respeta también en lo nuevo: las pestañas
  llevan `min-height:var(--tap)` y los dos botones de la invitación `min-width:var(--tap)`.
  Los chips de filtro estaban en 33px y suben a 44.
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
  propósito: pedirlo desde JS no desplaza nada con las animaciones del sistema apagadas. Con
  la invitación la regla se puso a prueba de verdad: **toda** su animación vive dentro de
  `prefers-reduced-motion: no-preference`, y apagada el ramo se ve entero y quieto.
- **Al cambiar de pestaña el foco salta al encabezado de la vista nueva**, con `tabIndex = -1`
  y `preventScroll`. Sin eso, el foco se queda en la pestaña y un lector de pantalla no anuncia
  que la pantalla cambió entera. En la cartelera el salto espera a que resuelvan los JSON,
  porque hasta entonces el encabezado no existe.
- **El `aria-label` del ramo describe el dibujo y no cuenta las flores**, a propósito: la cifra
  es la pista que lleva a una fecha y cantarla la regala. La lluvia de pétalos va
  `aria-hidden`: es adorno, no información.

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
| Mapa | **Hecho, con un límite geométrico atenuado.** Banda de 260px en móvil, columna a alto completo en escritorio; pines de 20px dibujados con CSS, nombre al pasar por encima y tarjeta al tocar. Mapa base OpenStreetMap, sin filtro. **Los dos modos de falla se verificaron provocándolos de verdad** cuando el respaldo era CARTO: con el CDN de Leaflet caído la banda se va a 0px, la columna se retira y la lista queda entera. El segundo modo cambió de comportamiento desde entonces —las teselas caídas ahora retiran el mapa en vez de cambiar de capa— y **falta volver a provocarlo** para verificarlo. **Los tres teatros de Miraflores estaban a 3px unos de otros** en la banda: el conjunto abarca 11,7 km (Cercado a Barranco) y esos tres están a 300 m, una razón de 39 a 1. En los ~620px de la columna de escritorio esa distancia pasa a unos 15px. La lista es la navegación real; el mapa contesta "¿está cerca?". |
| Presupuesto vertical | **Hecho.** Era el pendiente más viejo. La grilla de 42 celdas pasó a una tira horizontal con el mes plegado detrás de `<details>`: la caja del calendario cayó de ~340px a ~115px en escritorio y ~161px en móvil. Medido en navegador a 386×840 y a 1041×703. En móvil la primera tarjeta ahora empieza a 534px en vez de ~706px. **No se tocó el área táctil**: los chips siguen en 44px. |
| Calendario del mes | **Hecho.** Tira horizontal de los días que quedan del mes; las 42 celdas fijas siguen existiendo, plegadas en "Ver el mes completo". Lunes primero, punto en los días con función. |
| Sinopsis, género y elenco | **Hecho.** En la tarjeta y en el popup del mapa. Cobertura real: 13/20 con sinopsis, 12/20 con género, 9/20 con elenco; los huecos son huecos declarados y la línea desaparece entera en vez de decir "otro". |
| Estado "guardado" | **Pendiente, y hay código muerto.** `alternarGuardado()` y `leerGuardados()` existen en `datos.js` pero la interfaz nunca los llama. |
| Primera vez | **Cambió de forma.** La app se presenta con su nombre y sus cuatro pestañas en la cabecera, y el mapa avisa mientras carga. Pero **una visita limpia a la raíz ya no abre la cartelera**: `app.js` redirige una sola vez a `#una-pregunta` y deja la marca en localStorage. O sea que la primera pantalla de un visitante nuevo no es la cartelera, y sigue sin haber nada que explique qué es. |
| Marca del reloj | **Pendiente.** La del estado vencido se lee más como una L que como un reloj. |
| Afiches de obras | **Pendiente, y hoy no hay ninguno.** `imagen_local` está en `null` en las 20 obras, así que la regla "los afiches mandan" no tiene nada que gobernar todavía. Con la sinopsis en pantalla la tarjeta ya no depende de ellos para tener algo que decir, así que bajó de prioridad. |
| Filtros y tarjeta compartible | **Pendiente.** Diseñados y aprobados en las maquetas, sin implementar. El filtro de presupuesto se cae del plan junto con el precio; quedan **género** (12 obras con dato) y distrito. |
