# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Proyecto en español: código, comentarios y datos van en español.

## Comandos

```bash
npm test                          # Vitest, 87 pruebas sobre logica.js
npx vitest run -t "confianza"     # un solo grupo de pruebas por nombre
npm run test:watch                # reejecuta al guardar

npm run validar                   # valida los JSON, reporta cobertura de confianza
python scripts/validar_datos.py --deploy   # además falla si quedan _muestra
python scripts/validar_datos.py --permitir-regresion   # baja a aviso la pérdida de datos

npm run serve                     # la app en http://127.0.0.1:8000
```

Publicada en **https://raxcsu.github.io/cartelera-teatro-lima/** (GitHub Pages sirve `main`
desde la raíz; cada `git push` despliega).

**No abras `index.html` con doble clic.** `file://` no es contexto seguro y los módulos ES no
cargan. Siempre `http.server` o la URL publicada. Cuando se implemente la tarjeta compartible,
la Web Share API tendrá la misma restricción por el mismo motivo.

## Arquitectura

**Sin paso de build.** Editás un JSON, refrescás el navegador, ves el cambio. Lo que
se publica a GitHub Pages es exactamente lo que hay en el repo. `package.json` y
`node_modules/` existen solo para Vitest y nunca se publican. **La única excepción es
`data/paper_cientifico/paper.pdf`**, que se compila del `.tex` a mano y se commitea; ver "El
paper" más abajo.

**Los módulos están cortados por testabilidad, no por pantalla.** Es la
decisión de arquitectura más importante del proyecto:

```
app.js      router por hash                  ← decide qué vista se pinta    [existe]
datos.js    red + localStorage + overrides   ← única puerta a los datos     [existe]
logica.js   100% puro, cero imports          ← AQUÍ VIVEN LAS PRUEBAS       [existe]
vista.js    DOM de la cartelera                                            [existe]
mapa.js     Leaflet por CDN                  ← único trato con red externa  [existe]
escala.js   DOM de la escala astronómica     ← estático, no pide datos      [existe]
pregunta.js DOM de la invitación             ← SVG del ramo + celebración   [existe]
flores.js   canvas del cielo de flores       ← único bucle de rAF del repo  [existe]
tarjeta.js  Canvas + share                   (Fase 5)                       [NO existe]
```

`index.html` es la cabecera y el arranque, nada más. La capa DOM vivía inline ahí hasta que la
pantalla creció a mapa + calendario + mes; la mudanza no arrastró lógica de negocio porque esa
ya estaba separada, que era exactamente la apuesta. **La única excepción es el `<header>` con
el nombre de la app y su `<nav>`**, y está ahí a propósito: es constante y no dato, así se ve
durante "Cargando cartelera…" y sobrevive a los estados de error y de cartelera vencida, que
reemplazan todo `#app`. De paso es el único `<h1>` de la página, así que ninguna pantalla queda
sin encabezado de primer nivel. Que la navegación viva ahí tiene su propio motivo: **ninguna
de las otras tres vistas puede depender de que la cartelera logre cargar.**

## Las cuatro vistas

La app dejó de ser una sola pantalla. `app.js` despacha por hash a cuatro vistas que **no
comparten datos ni estados de error**:

| Ruta | Módulo | Qué es |
|---|---|---|
| `#cartelera` | `vista.js` | La cartelera: mapa, calendario y lista. La única que hace `fetch`. |
| `#escala-astronomica` | `escala.js` | Lectura estática: el resumen del paper y el PDF embebido. |
| `#una-pregunta` | `pregunta.js` | La invitación: el ramo en SVG y la celebración. |
| `#flores-amarillas` | `flores.js` | El cielo: galaxia, girasoles y corazón en `<canvas>`. |

**`RUTAS` ganó una columna, `desmontar`, y ese es el cambio de fondo que trajo la cuarta
vista.** Antes era una llamada suelta a `desmontarCartelera()` en `pintarRuta()`, porque la
cartelera era la única con algo que liberar. `flores.js` tiene un bucle de
`requestAnimationFrame`: dejarlo vivo es pintar para siempre una pantalla que ya no está —el
mismo defecto que `cicloVista` y `cicloMapa` evitan dentro de la cartelera, pero a nivel de
router. Ahora `pintarRuta()` apaga la ruta **saliente** (`RUTAS[rutaActual]?.desmontar?.()`) y
las vistas que no ensucian nada siguen sin la columna.

**`escala.js` no importa `datos.js` y `pregunta.js` sí, pero ninguna de las dos hace `fetch`.**
De `datos.js`, `pregunta.js` solo toma `hoyLima()`, que lee el reloj y nada más. Y lo toma como
**parámetro con valor por defecto** —`pintarPregunta(app, hoy = hoyLima())`— porque es la
primera vez que la regla "el tiempo se inyecta, no se lee" llega a una vista: ese segundo
argumento es lo único que hace probable el ramo sin tocar el reloj del sistema.

### El paper vive en `data/paper_cientifico/`

`paper.pdf` es lo que la vista embebe, con la ruta escrita **tres veces** en `js/escala.js`
(el botón, el `<object>` y el enlace de reserva para navegadores que no muestran PDF). **Si lo
movés o lo renombrás, tocá las tres**, o la vista queda con un visor vacío y sin decir por qué:
es el mismo riesgo de constante duplicada que `slug()` y que `PIN`.

`paper.tex` es la fuente y `paper.pdf` el compilado. **Es la única excepción a "sin paso de
build" del repo**, y se resuelve del modo más aburrido posible: el PDF se compila a mano y se
commitea junto al `.tex`. GitHub Pages sigue sirviendo exactamente lo que hay en el repo; lo
que no hay es una herramienta que regenere el PDF sola, así que **editar el `.tex` no cambia
nada en pantalla hasta que se recompile y se commitee el PDF**.

**Es hash y no rutas reales, y no es pereza.** GitHub Pages sirve archivos estáticos: una ruta
como `/una-pregunta` daría 404 al recargar. Con hash, entrar directo a cada vista funciona, y
atrás y adelante del navegador son navegación de verdad y no una imitación con botones.

`RUTAS` es una tabla y no un `if/else` por una razón concreta: cada vista necesita su título de
documento, su hash canónico y el selector del encabezado al que salta el foco. Con dos vistas
alcanzaba un ternario; con tres, esas cadenas crecen en cada pantalla nueva y el despacho deja
de estar en un solo sitio.

**Solo la cartelera devuelve una promesa.** Sus JSON tardan y el encabezado al que va el foco no
existe hasta que resuelva; las otras tres pintan sincrónicamente. Por eso `pintarRuta()` mira si
`pintar()` devolvió algo antes de mover el foco.

**Hay dos layouts, no uno responsive a medias.** Debajo de 900×600 es la columna de 430px de
siempre. Desde ahí es un grid de dos columnas: mapa a alto completo a la izquierda, y a la
derecha `.calendario-caja` fija sobre `.lista`, que es lo único que scrollea. Lo gobiernan tres
clases que pone `vista.js`: `pantalla` enciende el grid, `sin-mapa` retira su columna, y el
envoltorio `.panel` es la columna derecha. El detalle visual está en `DESIGN.md`.

`logica.js` no importa nada y no toca DOM ni red. Todo lo que puede estar mal en un
cálculo vive ahí y se prueba sin navegador. **Si estás por poner lógica de negocio en
`vista.js`, va en `logica.js`.** Es la regla que mandó a `mesInicial()`, `desplazarMes()`,
`rangoNavegable()`, `diasParaTira()` y `diaCorto()` a `logica.js` aunque parezcan cosas de
interfaz. El caso más claro es `generoVisible()`: la regla "`otro` no se muestra" vivía escrita
dentro de `popupTeatro()`, en `vista.js`, y al pasar el género también a la tarjeta habría
quedado decidida en dos archivos — que es exactamente como esas reglas se separan.

`tallosDelRamo()` entró por la misma puerta y es el caso más contraintuitivo: **el número de
flores del ramo ES una fecha**, no una decisión de dibujo. Decidirlo dentro de un template lo
dejaría sin prueba y sin un solo sitio donde mirarlo. Vive en `logica.js` con `RAMO_DESDE` y
`RAMO_MAX`, y tiene siete pruebas.

`mapa.js` está solo por una razón: es el **único** módulo que depende de recursos externos, y
son **dos** — la librería (unpkg) y el mapa base (OpenStreetMap). **Ninguna función suya
lanza.** Si cae el CDN de Leaflet, `crearMapa()` devuelve `null`, `vista.js` esconde la banda y
la lista queda entera. Si caen solo las teselas, `mapa.js` avisa por `alFallarTeselas` y
`vista.js` retira el mapa entero. Un fallo de red no puede leerse como "no hay teatro", y
tampoco puede quedar como un rectángulo gris sin explicación.

`datos.js` es la costura para V2: hoy hace `fetch` a archivos estáticos; cuando llegue
la votación apuntará a un Cloudflare Worker y ningún otro módulo se entera.

**El tiempo se inyecta, no se lee.** Ninguna función de `logica.js` llama a `Date.now()`.
Todas reciben `hoy` como parámetro, así se puede probar el paso del tiempo sin trucos.

## Las tres reglas del dato

1. **Nunca inventar.** Sin dato verificado va `null` (o `[]`, o `"otro"`), jamás algo
   plausible. Vale para el precio, y desde el reenfoque a la obra vale sobre todo para el
   texto:

   - `sinopsis: null` si ninguna fuente la publica. No se redacta a partir del título.
   - `tipo: "otro"` es literalmente **"nadie lo dijo"**, no un género. Ojo con la trampa que
     ya apareció: Teleticket clasifica todo bajo *Teatro*, y eso es una **categoría**, no un
     género. Tampoco se le lee "drama" a la palabra "dramaturgia".
   - `elenco: []` si la fuente no publica nombres. **Nadie decide acá quién es "conocido"**:
     si la fuente nombra a alguien es porque es el gancho. Y un nombre de pila suelto
     ("Maribel", "Milagros") no es un dato verificable — o se consigue el apellido con
     fuente, o el elenco va vacío. Pasó con las dos.

   Los precios siguen guardándose con esta misma regla aunque ya no se muestren.
2. **La fuente viaja con el dato.** Cada función lleva `fuente_url` y `verificado_el`, y una
   obra con sinopsis o elenco necesita `fuente_url`. `validar_datos.py` rechaza las dos cosas.
3. **La confianza se calcula, no se lee.** `confianzaEfectiva()` combina el nivel con
   la antigüedad de `verificado_el`. Algo confirmado hace seis semanas no puede verse igual
   que algo de hoy.

   **El semáforo cambió de sujeto.** Antes certificaba el precio, y por eso el validador
   exigía `precio_min` en todo `confirmado`. Ahora que el precio no se muestra, certifica
   **la función**: "esto va a ocurrir, esta fecha, en este teatro". La prueba más fuerte de
   eso es poder comprar la entrada, así que `confirmado` exige `url_entradas` además de
   `fuente_url` y `verificado_el`.

## IDs deterministas

Derivados del contenido, **nunca de un contador**, con tope de 60 caracteres. Si fueran
correlativos, cada regeneración de la cartelera los barajaría: los guardados apuntarían a
obras equivocadas y el `git diff` sería ilegible.

`slug()` está implementado dos veces, en `js/logica.js` y en `scripts/validar_datos.py`.
**Si tocás uno, tocá el otro**, o los IDs del script y de la app dejan de coincidir.
`SLUG_MAX` tiene que ser el mismo número en ambos.

## Cosas que parecen bugs y no lo son

- **La tira de días esconde los días, la grilla esconde el mes.** La tira lleva TODOS los días
  que quedan del mes, con función o sin ella, porque los huecos son información: si listara
  solo los días con teatro, tres días seguidos se verían igual que tres salteados. Pero
  `diasParaTira()` devuelve `[]` —y entonces no hay tira— cuando no queda **ni una** función
  por delante. Salió en pantalla: octubre mostraba 31 chips muertos encima del cartel "nada
  cargado en octubre", el mismo dato contado dos veces y una con ruido. Es la misma regla que
  ya seguía el mapa.
- **Los chips siguen midiendo 44px, y no es contradictorio con "achicar el calendario".** Lo
  que se achicó para ganar ~180px es el **número de filas** (seis → una), no el blanco al que
  hay que apuntar con el dedo. Bajar la celda a 36px habría sido romper la regla de área
  táctil de `DESIGN.md` a cambio de la mitad del ahorro.
- **El recorte de la sinopsis y el botón "seguir leyendo" salen del MISMO booleano**
  (`necesitaRecorte()`, vía la clase `.recortable`). Si el CSS recortara siempre, una sinopsis
  apenas más larga que tres líneas escondería su final sin ofrecer cómo abrirlo. Por eso una
  sinopsis corta se muestra entera aunque ocupe cuatro líneas.
- **`precio_min: null` no se descarta por presupuesto.** Un precio desconocido no es un
  precio caro. Ya no hay filtro de presupuesto, pero la regla sigue valiendo si vuelve.
- **Los TRES estados de vacío son distintos a propósito.** "Nada cargado en septiembre",
  "esta cartelera está vencida" y "no se pudieron cargar los datos" tienen distinto color,
  distinto texto y distinta acción. Si se parecieran, el modelo de confianza quedaría anulado
  en la práctica: el usuario leería "no hay teatro" en los tres casos.
- **`data/overrides.json` se aplica ENCIMA de todo refresco.** Ahí van las correcciones
  humanas. Sin eso, verificás una coordenada a mano y el siguiente refresco la borra. Dejó de
  ser teoría: el refresco de `20c1888` regeneró `obras.json` y borró 8 sinopsis, 8 elencos y 4
  géneros de un saque, con el archivo de overrides vacío. Hoy lleva **13 obras** con los campos
  que la investigación ganó a mano. Va SOLO eso: si se le mete lo que trae el refresco, deja de
  ser un archivo de correcciones y pasa a ser una segunda copia de los datos.
- **El validador falla si un campo investigado se vacía respecto de git, y eso NO contradice la
  regla 1.** Cada obra por separado siempre es legal —un hueco declarado (`null`, `[]`, `"otro"`)
  es exactamente lo que la regla 1 pide—, así que el resto del validador no puede distinguir
  "nadie lo publica" de "alguien lo borró". La única forma de ver la diferencia es comparar
  contra la versión anterior: eso hace `regresion_de_datos()`. Compara **obra por obra y no el
  total**, porque una obra que sale de cartelera baja la cobertura global sin que se haya
  perdido nada, y hacerla fallar por eso enseñaría a saltarse el guardarraíl. Si el hueco es
  correcto porque el dato resultó falso, `--permitir-regresion` lo baja a aviso.
- **El precio no está en pantalla, pero sí en los JSON.** Se retiraron `rangoPrecio()`,
  `calcularCostoTotal()`, `PERSONAS`, `formatearSoles()` y el criterio `precioMax` de
  `filtrarFunciones()`: lo que se fue es la manera de mostrarlos, no el dato. Siguen con su
  fuente y su fecha, y el validador los sigue revisando. Si vuelven a pantalla, vuelven del
  historial de git — y con ellos la guarda contra `S/ NaN`.
- **`scrollIntoView` NO lleva `behavior: 'smooth'`, y no es un olvido.** Con las animaciones
  del sistema apagadas, pedir `smooth` desde JS no desplaza nada: se queda quieto, en silencio.
  La suavidad se declara en CSS (`html{scroll-behavior:smooth}`), que degrada a salto
  instantáneo pero siempre llega.
- **La grilla del mes son 42 celdas siempre**, aunque el mes entre en 4 filas. Si cambiara de
  alto al navegar, la lista de abajo saltaría bajo el dedo. Ahora vive plegada dentro de
  `<details class="mes-completo">`, pero **no se eliminó**: sigue siendo el único sitio donde
  se ve la *forma* del mes, o sea qué cae en fin de semana y dónde están los huecos largos.
- **A la tira NO se le hace `scrollIntoView`, y es primo del bug de `behavior:'smooth'`.**
  Sobre un hijo de un contenedor con scroll horizontal, `scrollIntoView` desplaza además el
  ancestro vertical, y en escritorio eso mueve `.lista` sola al cargar. Hoy no hace falta
  ninguna de las dos cosas —`diasParaTira()` ya descarta lo pasado, así que hoy es siempre el
  primer chip y `scrollLeft` 0 es lo correcto—, pero si algún día hay que centrar otro día, va
  con `tira.scrollLeft = ...`.
- **Las flechas del calendario llegan un mes más allá de lo cargado** (`rangoNavegable()`).
  Frenar en el borde deja las dos flechas muertas cuando hay un solo mes de datos, y con eso el
  estado "nada cargado en septiembre" queda inalcanzable.
- **La banda del mapa se revela ANTES de crear el mapa**, nunca después. Un elemento con
  `[hidden]` no tiene caja, así que Leaflet lo mide 0×0, `fitBounds()` calcula un zoom enorme y
  `maxZoom` lo recorta en 15: el mapa queda centrado bien y con todos los teatros a más de mil
  píxeles fuera de cuadro. Salió así en producción. Y no se arregla después: `invalidateSize()`
  corrige el tamaño pero conserva el zoom, y un `ResizeObserver` tampoco, porque Chrome no
  notifica elementos sin caja.
- **Un `href` necesita `urlSegura()`, no alcanza con `esc()`.** El escape convierte `<>&"` y no
  toca ni un carácter de `javascript:alert(1)`, que se ejecuta igual al hacer clic. Los links de
  compra y de fuente los llena una investigación externa (`docs/encargo-cartelera.md`), así que
  el dato entra de afuera. `validar_datos.py` hace la misma comprobación del lado de los datos.
- **Las teselas son OpenStreetMap, y eso agrega una SEGUNDA dependencia externa con un modo
  de falla distinto.** Si cae el CDN de Leaflet, `crearMapa()` devuelve `null` y la banda
  desaparece limpia. Si caen **solo las teselas**, Leaflet vive y deja un rectángulo gris con
  pines flotando sobre nada — el hueco sin explicación que este proyecto evita. Por eso hay un
  contador sobre `tileerror` que, pasados 6 fallos, llama a `alFallarTeselas` **una sola vez**
  y `vista.js` retira el mapa entero: destruye la instancia, esconde la caja y pone `sin-mapa`.
  Hubo un respaldo que cambiaba de proveedor a mitad de camino (CARTO → OSM); se retiró con la
  vuelta a OSM como único mapa base. Degradar a la lista entera es más honesto que degradar a
  un segundo proveedor que puede estar caído por el mismo motivo.
- **`crearMapa()` puede resolver DESPUÉS de que el mapa ya se dio por fallido, y por eso hay
  tres guardas y no una.** La red puede caerse mientras Leaflet todavía carga. `pintarMapa()`
  revisa al volver de `await`: si cambió el ciclo (`cicloMapa`), si se apagó `pantalla`, o si
  `alFallarTeselas` ya corrió, destruye el mapa recién creado en vez de asignarlo. Sin eso
  quedaba una instancia viva en un contenedor escondido, y la caja se volvía a revelar encima
  del callback que acababa de esconderla.
- **`PIN` en `js/mapa.js` y el `width` de `.pin-teatro i` en `styles.css` son el mismo número
  (20), y tienen que seguir siéndolo.** De `PIN` sale el `iconAnchor` (`[PIN/2, PIN/2]`), que
  es el punto del círculo que se apoya en la coordenada real. Si los dos se separan, cada
  teatro queda corrido en pantalla respecto de dónde está, y **en silencio**: el mapa se ve
  perfecto. Con el pin en 11px y el ancla en `[7,7]` el desvío ya era de ~1,5px.
- **No hay filtro sobre las teselas, y eso fue a propósito.** Hubo uno para calmar los verdes
  y los amarillos de OSM; se retiró al pasar a Positron, y no volvió al volver a OSM. Si algún
  día vuelve, el filtro va en `.leaflet-tile-pane` y **nunca** en el contenedor: Leaflet separa
  teselas, marcadores, popups y controles en *panes* distintos, y teñir el contenedor apagaría
  el acento y el semáforo junto con el mar.
- **La hoja de Leaflet se inserta ANTES de `styles.css`, no al final del `<head>`.** Trae
  reglas para el popup, los controles y la atribución con la misma especificidad que las
  nuestras, y el orden desempata: agregada al final ganaba todas y el mapa se veía por defecto
  por más que `styles.css` dijera otra cosa. Ver `pedirCss()` en `js/mapa.js`; es lo que evita
  una fila de `!important`.
- **`.sin-mapa` no es decorativa.** En móvil alcanzaba con esconder la caja del mapa: la lista
  subía. En el grid de escritorio, esconder el contenido deja la pista de la columna en pie, o
  sea media pantalla vacía. La clase retira la columna entera. Se resolvió con una clase y no
  con `:has()` para no depender de soporte reciente.
- **`:has()` SÍ se usa, y la regla no es "nunca" sino "nunca para sostener el layout".** El
  caso es `html:has(.app.escala){scrollbar-width:none}` en `styles.css`. La diferencia con
  `.sin-mapa` es el modo de falla: sin soporte de `:has()`, ahí solo se ve una barra de scroll
  que iba a esconderse, y no se rompe nada; si `.sin-mapa` dependiera de `:has()` y el
  navegador no lo tuviera, quedaría media pantalla vacía. **Antes de usar `:has()`, preguntá
  qué se ve si no existe:** si la respuesta es "una diferencia cosmética", va; si es "el layout
  queda mal", va una clase que ponga `vista.js`.
- **`min-height:0` en `.app`, `.panel` y `.lista` es lo que hace posible el scroll interno.**
  Por defecto un hijo de grid o de flex no baja de su tamaño de contenido, así que el
  `overflow-y:auto` de la lista nunca se activaría: crecería la página entera y el mapa se
  iría de cuadro. El síntoma no se parece en nada a la causa.
- **El ancho del popup se configura en JS, jamás en CSS.** Leaflet mide el contenido y escribe
  el ancho inline en `.leaflet-popup-content`; una regla que lo pise le rompe el cálculo. Va en
  `bindPopup({maxWidth, minWidth})`.
- **`zoomSnap: 0.25`, y no es un capricho.** Por defecto `fitBounds` redondea el zoom hacia
  abajo al entero más cercano, y medio nivel es un factor de 1,4 de más: los teatros entraban
  en el 40% del alto y el resto era Lurigancho y mar. En cuartos el error máximo baja a 1,09.
- **El mapa muestra solo de hoy en adelante, igual que la lista.** Un pin de un teatro cuyas
  funciones ya pasaron no tiene tarjeta a la que llevar: su "Ver más" no haría nada, y en
  silencio. Como efecto, un mes enteramente pasado no tiene mapa, y ahí entra `.sin-mapa`.
- **El popup lo arma `vista.js`, no `mapa.js`.** Llega en el punto como `popupHtml`, ya
  escapado. `mapa.js` no conoce obras ni precios y no puede empezar a conocerlos por un popup;
  el id del "Ver más" viaja en el propio botón (`data-ver-mas`) para no tener que leer
  `_source`, que es API privada de Leaflet.
- **Una obra sin `duracion_min` se supone de 2 h, y la pantalla lo dice.** El código viejo usaba
  `?? 0`, con lo que la obra "terminaba" a la hora de empezar y `cocinaAbierta()` dejaba pasar
  sitios que ya iban a estar cerrados. `horaDeSalida()` devuelve `supuesta: true` para que la
  tarjeta declare el supuesto en vez de esconderlo.
- **La escala esconde la barra de scroll, y en móvil la página SÍ scrollea.** En escritorio
  `.app.escala` lleva `overflow:hidden` y no scrollea nada: el PDF scrollea por dentro. En
  móvil no hay tal regla, así que la página se desplaza normalmente aunque la barra esté
  escondida por `html:has(.app.escala)`. Es la única pantalla del proyecto donde se esconde un
  afordance de scroll, y vale revisarlo si alguna vez alguien no encuentra el final del texto.
- **El comentario de la cabecera en `styles.css` dice "no vive en `vista.js`" y quedó viejo.**
  El de `index.html` se actualizó a "los módulos de vista" cuando entró el router; el del CSS
  no. Es solo un comentario, pero es el último sitio del repo que afirma que hay una sola vista.
- **El ramo NO usa `Math.random()` y la celebración SÍ, y no se contradicen.** El ramo tiene
  que ser idéntico en cada visita porque su forma y su número son un dato: sale de `ruido()`,
  un seno determinista sembrado con el índice, por la misma razón por la que los IDs salen del
  contenido y no de un contador. La lluvia de pétalos dura tres segundos, no se compara con
  nada y no vuelve, así que ahí `Math.random()` es correcto.
- **El `aria-label` del ramo no dice cuántas flores hay, y eso no es un descuido de
  accesibilidad.** La cifra es la única pista que lleva a la fecha en que empezaron; un lector
  de pantalla que la cante la regala antes de que ella pueda contarlas. El label describe qué
  es el dibujo ("un ramo de rosas y claveles"), que es lo que un label tiene que hacer.
- **Los rosas y el verde de las flores están definidos en `.app.pregunta`, no en `:root`, y el
  verde NO es `--ok`.** `--ok` es el verde del semáforo de confianza y la paleta prohíbe
  reusarlo para decorar — la misma regla por la que el acento es rosa vino y no dorado. Un
  ramo pintado con el verde del semáforo haría que "confirmado" dejara de leerse como estado.
- **`vista.js` lleva dos contadores de ciclo (`cicloVista`, `cicloMapa`) y no sobran.** Al
  cambiar de pestaña puede quedar un `import()` de Leaflet o un `fetch` en vuelo. Sin los
  contadores, esa promesa resuelve más tarde y escribe en el DOM de una vista que ya no está,
  o deja un mapa vivo en un contenedor escondido. `desmontar()` incrementa los dos, y es lo que
  `app.js` llama antes de pintar cualquier ruta.
- **Volver a Cartelera NO recarga los JSON ni vuelve al mes de hoy, a propósito.** `datos` se
  cachea y `mesVisible` se conserva: los datos no cambian al alternar pestañas dentro de una
  misma sesión, y perder el mes elegido al ir a leer el paper y volver se siente como un bug.
  El mes solo se reinicia si quedó fuera de `rangoNavegable()`.
- **La invitación se abre sola UNA vez, y solo al entrar limpio a la raíz.** Un hash explícito
  gana siempre: un link a `#cartelera` tiene que llevar a la cartelera aunque la marca todavía
  no exista. La marca es `teatro.pregunta.vista` en localStorage, y si localStorage no está
  disponible **no se abre**: sin poder cumplir el "una sola vez", es mejor no secuestrar la
  raíz que secuestrarla en cada carga.
- **La respuesta de la invitación no se guarda, y eso también fue deliberado.** Recordarla
  dejaba los dos botones muertos para siempre después del primer clic, y no hay nada del otro
  lado esperando ese dato. Cada carga vuelve a preguntar.
- **`styles.css` se pide con `?v=…` y hay que moverlo al cambiar el CSS.** GitHub Pages cachea
  agresivo y un layout nuevo servido con el CSS viejo se ve roto, no desactualizado. El valor
  actual es `20260918-petalos`; la convención es fecha más una palabra de qué cambió.
- **Las entradas reales están en `.gitignore` y no pueden entrar nunca.**
  `docs/bodas_figaro_entradas.pdf` y `docs/entrada_valeria.png` llevan DNI, número de compra y
  los QR de acceso. Este repo es público y cada push despliega: un commit descuidado las
  publica y el historial de git no las olvida.

## Diseño

`DESIGN.md` es la fuente de verdad visual: paleta con contraste ya verificado, tipografía
y reglas de composición. No inventes colores nuevos.

Dos reglas que se rompen sin querer:

- **El semáforo de confianza (verde/ámbar/gris) no se reusa para decoración.** Por eso el
  acento es rosa vino y no dorado: un acento ámbar haría que el aviso dejara de leerse
  como aviso.
- **Cero emoji.** Renderizan distinto en cada celular. Los iconos se dibujan con CSS.

## Estado del proyecto

Fases 0 y 1 terminadas y publicado; encima va el **reenfoque a teatro**: la unidad dejó de ser
el "plan de dos con cena" y pasó a ser la función. Encima de eso, el **layout de escritorio**
(pendiente #1 de `DESIGN.md`): dos columnas desde 900×600, mapa protagonista y tarjeta al
tocar un pin.

Y encima de eso, el **reenfoque a la obra**. La pregunta del producto dejó de ser *"¿cuánto
sale?"* y pasó a ser *"¿qué obra es y vale la pena?"*:

- Entraron **sinopsis, género y elenco** a la tarjeta. La sinopsis va recortada a 3 líneas con
  "seguir leyendo".
- **Salió el precio de la pantalla**, el de entradas y el de restaurantes. El dato se queda en
  los JSON con su fuente; lo que se retiró son las funciones que lo mostraban.
- El calendario pasó de una grilla de seis filas a una **tira horizontal de días** con el mes
  completo plegado detrás de `<details>`. Son ~180px menos, que es lo que sube la obra.
- El círculo de los teatros en el mapa pasó de 11 a 20px. Las teselas pasaron por CARTO
  Positron y **volvieron a OpenStreetMap**, que hoy es el único mapa base.

Y encima de todo eso, lo último: la app **dejó de ser una sola pantalla**. `app.js` despacha
por hash a cuatro vistas —`#cartelera`, `#escala-astronomica`, `#una-pregunta` y
`#flores-amarillas`— y la cabecera lleva la navegación. La cartelera es la única que pide
datos; las otras tres son autosuficientes a propósito, así que siguen en pie aunque los JSON
estén caídos o la cartelera vencida. Ver "Las cuatro vistas".

La última en entrar, **flores amarillas**, era una página suelta en `docs/` y ahora es una
vista: un cielo en `<canvas>` con una galaxia, seis girasoles y un corazón de partículas. Es
la única pantalla oscura del proyecto y el único módulo con un bucle de `requestAnimationFrame`
—de ahí la columna `desmontar` en `RUTAS`—. Cada flor tiene un mensaje y un botón DOM de 44px;
el corazón abre la carta final. Los siete contenidos reutilizan un solo `<dialog>`, y si el
contexto 2D falla aparecen como lista en vez de desaparecer con el dibujo. Las semillas se
precalculan, las chispas tienen tope y el cambio de `prefers-reduced-motion` detiene o reanuda
el bucle durante la sesión.

En los datos hay 18 teatros, 20 obras, 122 funciones repartidas en agosto y septiembre, y 53
lugares para cenar. **94 de las 122 funciones tienen `url_entradas`**, así que el botón "Comprar
entradas" sale en esas y no en el resto. Cobertura de la obra: **13/20 con sinopsis, 12/20 con
género real, 9/20 con elenco**. Casi todos los huecos son de las 7 obras que trajo el último
refresco y que todavía no pasaron por investigación; el resto son huecos declarados —ninguna
fuente los publica— y así tienen que quedarse hasta que alguna lo haga.

**Los 18 teatros tienen coordenadas**, así que todas las funciones aparecen
en el mapa y `npm run validar` sale con **cero avisos**. De paso se corrigió la dirección del
Británico y se resolvió el conflicto de sede de *Noche de enredos*, que Teleticket titula
"Centro Cultural Ricardo Palma" pero se da en el Teatro Auditorio Miraflores.

Lo que sigue faltando: solo 7 de los 18 teatros tienen `web`.

**Se retiró el ranking.** `PESOS`, `puntuarFuncion()`, `proponerPlanes()` y `motivoDelPrimero()`
ya no existen: en un calendario el orden lo manda la fecha, y buscar "qué hay el viernes 28" es
incompatible con una lista ordenada por puntaje. Están en el historial de git.

**El candado de la Fase 1 ya pasó**, y su lección es la que más vale conservar. Exigía
demostrar que un fin de semana real produce 3 planes con precio conocido dentro de presupuesto
antes de invertir en pantallas. El precio ya no se muestra, pero el motivo del candado sigue
en pie y se acaba de repetir con la sinopsis: **esto es un proyecto de datos disfrazado de
proyecto de interfaz**. La tarjeta nueva no valía nada mientras 9 de 12 obras no tuvieran de
qué hablar; lo que la hizo funcionar fue la investigación, no el CSS.

**25 de las 122 funciones están `confirmado`** (20%), 52 `probable` y 45 `sin_verificar`. El
porcentaje cayó respecto del 43% anterior y no es que los datos hayan empeorado: el último
refresco casi triplicó el total, y lo que entra nuevo entra sin confirmar. Ojo también con la
comparación más vieja: hasta el reenfoque ninguna llegaba a `confirmado` porque el semáforo
certificaba el precio y los precios salían de agregadores editoriales. Ahora certifica que la
función existe y la prueba es `url_entradas`, que es un criterio distinto — no es que los datos
hayan mejorado de golpe, es que se está midiendo otra cosa.

**Los documentos de planificación viven fuera del repo**, en `~/.gstack/projects/teatro/`: el
diseño con las 14 tareas y el informe de revisiones, la bitácora de diferidos, el plan de
pruebas y el plan original superado. El repo público es solo código y datos, a propósito. Si
vas a trabajar acá, leelos primero: llevan el porqué de casi todas las decisiones.

**Lo que sigue:** filtros —ahora por **género**, que ya tiene 12 obras con dato, y por distrito;
el de precio se fue con el precio— y la tarjeta compartible. La geocodificación de los teatros,
que era el pendiente #1, ya está hecha.

Queda **una deuda menor de datos**: dos shows publican solo el nombre de pila de sus
comediantes ("Maribel y Jaime" en *Nos casamos la cagamos*) y por eso su `elenco` va vacío. Si
aparece una fuente citable con los apellidos, entra.

El ítem 0 de la bitácora —el gasto de los locales de alta cocina— **dejó de ser urgente**: los
gastos ya no se muestran. Sigue valiendo la pena arreglarlo si vuelven, pero ya no hay un
número equivocado en pantalla.

**Todavía no existe** `.claude/commands/actualizar-cartelera.md`. El refresco se hace a mano,
pero `docs/encargo-cartelera.md` ya tiene el procedimiento entero escrito y es la semilla
directa de ese comando.

## Skill routing

Cuando el pedido coincida con una skill, invocala con la herramienta Skill.

- Ideas de producto → `/office-hours`
- Arquitectura → `/plan-eng-review`
- Diseño → `/plan-design-review`
- Bugs → `/investigate`
- Probar la app → `/qa`
- Revisar el diff → `/review`
- Publicar → `/ship`
