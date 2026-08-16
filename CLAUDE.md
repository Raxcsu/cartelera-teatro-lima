# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Proyecto en español: código, comentarios y datos van en español.

## Comandos

```bash
npm test                          # Vitest, 79 pruebas sobre logica.js
npx vitest run -t "confianza"     # un solo grupo de pruebas por nombre
npm run test:watch                # reejecuta al guardar

npm run validar                   # valida los JSON, reporta cobertura de confianza
python scripts/validar_datos.py --deploy   # además falla si quedan _muestra

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
`node_modules/` existen solo para Vitest y nunca se publican.

**Los módulos están cortados por testabilidad, no por pantalla.** Es la
decisión de arquitectura más importante del proyecto:

```
datos.js    red + localStorage + overrides   ← única puerta a los datos     [existe]
logica.js   100% puro, cero imports          ← AQUÍ VIVEN LAS PRUEBAS       [existe]
vista.js    DOM                                                            [existe]
mapa.js     Leaflet por CDN                  ← único trato con red externa  [existe]
tarjeta.js  Canvas + share                   (Fase 5)                       [NO existe]
```

`index.html` quedó en 20 líneas: importa `vista.js` y arranca. La capa DOM vivía inline ahí
hasta que la pantalla creció a mapa + calendario + mes; la mudanza no arrastró lógica de
negocio porque esa ya estaba separada, que era exactamente la apuesta.

`logica.js` no importa nada y no toca DOM ni red. Todo lo que puede estar mal en un
cálculo vive ahí y se prueba sin navegador. **Si estás por poner lógica de negocio en
`vista.js`, va en `logica.js`.** Es la regla que mandó a `mesInicial()`, `desplazarMes()`,
`rangoNavegable()` y `rangoPrecio()` a `logica.js` aunque parezcan cosas de interfaz.

`mapa.js` está solo por una razón: es el **único** punto que depende de un recurso externo.
**Ninguna función suya lanza.** Si el CDN se cae, `crearMapa()` devuelve `null`, `vista.js`
esconde la banda y la lista queda entera. Un fallo de red no puede leerse como "no hay teatro".

`datos.js` es la costura para V2: hoy hace `fetch` a archivos estáticos; cuando llegue
la votación apuntará a un Cloudflare Worker y ningún otro módulo se entera.

**El tiempo se inyecta, no se lee.** Ninguna función de `logica.js` llama a `Date.now()`.
Todas reciben `hoy` como parámetro, así se puede probar el paso del tiempo sin trucos.

## Las tres reglas del dato

1. **Nunca inventar.** Sin precio verificado va `precio_min: null` y
   `confianza: "sin_verificar"`. Jamás un número plausible. Consecuencia obligatoria:
   nada aritmético toca un precio sin guarda, o la pantalla muestra `S/ NaN`.

   **Excepción reglada: el gasto referencial.** Una estimación **con base documentada** sí se
   permite, y no es lo mismo que inventar. Lleva `gasto_referencial: true` (lugares) o
   `precio_referencial: true` (funciones) **más la fuente de la estimación**. Sin fuente, no es
   referencial: es inventado.

   Ojo con cómo se muestra, porque son dos cosas distintas: en el desplegable de cena el total
   lleva la palabra completa (`cena x2 estimada`, vía `costo.incluye`), pero **el precio grande
   de la tarjeta solo lleva la virgulilla** (`~S/ 50`). Que el significado viaje en un solo
   carácter de puntuación es débil y contradice el espíritu de la regla de accesibilidad de
   `DESIGN.md` ("la confianza nunca depende de una sola señal"). Hoy no se nota porque ninguna
   función tiene `precio_referencial: true`; cuando alguna lo tenga, conviene arreglarlo.
2. **La fuente viaja con el dato.** Cada función lleva `fuente_url` y `verificado_el`.
   `validar_datos.py` rechaza un `confirmado` sin ambos.
3. **La confianza se calcula, no se lee.** `confianzaEfectiva()` combina el nivel con
   la antigüedad de `verificado_el`. Un precio confirmado hace seis semanas no puede
   verse igual que uno de hoy.

## IDs deterministas

Derivados del contenido, **nunca de un contador**, con tope de 60 caracteres. Si fueran
correlativos, cada regeneración de la cartelera los barajaría: los guardados apuntarían a
obras equivocadas y el `git diff` sería ilegible.

`slug()` está implementado dos veces, en `js/logica.js` y en `scripts/validar_datos.py`.
**Si tocás uno, tocá el otro**, o los IDs del script y de la app dejan de coincidir.
`SLUG_MAX` tiene que ser el mismo número en ambos.

## Cosas que parecen bugs y no lo son

- **`precio_min: null` no se descarta por presupuesto.** Un precio desconocido no es un
  precio caro. Descartarlo escondería funciones que quizá sí entran.
- **Los TRES estados de vacío son distintos a propósito.** "Nada cargado en septiembre",
  "esta cartelera está vencida" y "no se pudieron cargar los datos" tienen distinto color,
  distinto texto y distinta acción. Si se parecieran, el modelo de confianza quedaría anulado
  en la práctica: el usuario leería "no hay teatro" en los tres casos.
- **`costo.completo`, `costo.incluyeCena` y `costo.estimado` son tres cosas distintas.**
  `completo` = no falta ningún precio de lo que está incluido. `incluyeCena` = el plan tiene
  restaurante. `estimado` = alguno de esos precios es una estimación referencial. Un plan sin
  restaurante tiene `completo: true` e `incluyeCena: false`; confundirlos hacía que la pantalla
  dijera "los dos, con cena" en planes sin cena. Para saber qué cuenta el total, leé
  `costo.incluye`, que es la lista literal (`['entradas x2', 'cena x2 estimada']`).
- **`data/overrides.json` se aplica ENCIMA de todo refresco.** Ahí van las correcciones
  humanas. Sin eso, verificás una coordenada a mano y el siguiente refresco la borra.
- **El precio grande es la entrada suelta, no el total para dos.** `rangoPrecio()` muestra lo
  que publica la fuente y nada más: `S/ 30 – 50`, `desde S/ 35`, `S/ 40`. Multiplicar por dos
  haría que el número no coincida con el de Teleticket. `calcularCostoTotal()` sigue existiendo
  pero solo dentro del desplegable de cena.
- **`scrollIntoView` NO lleva `behavior: 'smooth'`, y no es un olvido.** Con las animaciones
  del sistema apagadas, pedir `smooth` desde JS no desplaza nada: se queda quieto, en silencio.
  La suavidad se declara en CSS (`html{scroll-behavior:smooth}`), que degrada a salto
  instantáneo pero siempre llega.
- **La grilla del mes son 42 celdas siempre**, aunque el mes entre en 4 filas. Si cambiara de
  alto al navegar, la lista de abajo saltaría bajo el dedo.
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
- **Una obra sin `duracion_min` se supone de 2 h, y la pantalla lo dice.** El código viejo usaba
  `?? 0`, con lo que la obra "terminaba" a la hora de empezar y `cocinaAbierta()` dejaba pasar
  sitios que ya iban a estar cerrados. `horaDeSalida()` devuelve `supuesta: true` para que la
  tarjeta declare el supuesto en vez de esconderlo.

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
el "plan de dos con cena" y pasó a ser la función. Mapa arriba, calendario del mes, lista por
día, precio de entrada y links. Los restaurantes viven dentro de un desplegable por tarjeta.

En los datos hay 5 teatros, 5 obras, 5 funciones para el sábado 22 de agosto y 53 lugares para
cenar. **Ninguna función tiene `url_entradas` y ningún teatro tiene `web`**, así que el botón
"Comprar entradas" todavía no aparece en pantalla: aparece solo cuando el dato exista. Llenar
eso, y las fechas del mes completo, es el trabajo de `docs/encargo-cartelera.md`.

**Se retiró el ranking.** `PESOS`, `puntuarFuncion()`, `proponerPlanes()` y `motivoDelPrimero()`
ya no existen: en un calendario el orden lo manda la fecha, y buscar "qué hay el viernes 28" es
incompatible con una lista ordenada por puntaje. Están en el historial de git.

**El candado de la Fase 1 ya pasó.** Exigía demostrar que un fin de semana real produce 3
planes con precio conocido dentro de presupuesto, antes de invertir en pantallas. Salieron 5
obras con precio publicado, y las 3 mejores quedaron entre S/ 130 y S/ 170 para dos. Vale
recordar por qué existía: **esto es un proyecto de datos disfrazado de proyecto de interfaz**,
y si los datos no alcanzan, ninguna pantalla lo arregla.

**Ninguna función está `confirmado`, y es correcto.** Los precios salen de agregadores
editoriales, no de la web oficial ni del checkout. Por la definición de la Regla 2 eso es
`probable`, así que la app muestra ámbar en todas. Subirlas exige abrir la web de cada teatro.

**Los documentos de planificación viven fuera del repo**, en `~/.gstack/projects/teatro/`: el
diseño con las 14 tareas y el informe de revisiones, la bitácora de diferidos, el plan de
pruebas y el plan original superado. El repo público es solo código y datos, a propósito. Si
vas a trabajar acá, leelos primero: llevan el porqué de casi todas las decisiones.

**Lo que sigue:** que se ejecute `docs/encargo-cartelera.md` y entren los datos del mes
completo con sus links. Sin eso, el calendario tiene un solo día marcado y el botón de comprar
no aparece nunca. Después: filtros y tarjeta compartible. Sigue pendiente corregir el gasto de
los locales de alta cocina vía `overrides.json` (ítem 0 de la bitácora).

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
