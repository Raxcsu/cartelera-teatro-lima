# Theater with her — cartelera de teatro de Lima

**En vivo: https://raxcsu.github.io/cartelera-teatro-lima/**

Un sitio personal de seis pestañas. La principal es la **cartelera**: el teatro de Lima del mes
en una pantalla, con mapa de los teatros, tira de días, y por cada función **de qué trata la
obra, de qué género es y quién actúa**, con su hora, su teatro y el link de compra. Dónde cenar
cerca queda a un toque de distancia, en segundo plano.

El precio se guarda con su fuente pero no se muestra: la pregunta que contesta la cartelera es
"¿qué obra es y vale la pena?", no "¿cuánto sale?".

Las otras cinco pestañas son piezas personales, no producto: una **lectura** con un paper y su
resumen, una **invitación**, un **cielo de flores amarillas**, el **recuerdo del primer mes** y
la **noche criolla**, la invitación a un concierto con un reloj que cambia con la hora de Lima.
Ninguna pide datos al servidor, así que siguen en pie aunque la cartelera no pueda cargar.

En el celular va todo apilado; desde 900×600 la cartelera se abre en dos columnas, con el mapa
grande a la izquierda y el calendario sobre la lista a la derecha. El breakpoint pide alto
además de ancho: en una ventana ancha y baja, la columna de siempre es mejor respuesta.

Proyecto personal. Sin framework, sin base de datos, sin paso de build.

## Arrancar

```bash
npm run serve                  # http://127.0.0.1:8000
```

No lo abras con doble clic: `file://` no es contexto seguro y rompe los módulos ES.

Para desarrollo:

```bash
npm install                    # solo Vitest, nunca se publica
npm test                       # 123 pruebas: 102 de logica.js + 21 de cielo.js
npm run validar                # valida los JSON y reporta cobertura de confianza y de obra
```

## Cómo está armado

```
index.html   styles.css
js/  app.js      router por hash — decide cuál de las seis vistas se pinta
     datos.js    red, localStorage, overrides
     logica.js   100% funciones puras — lógica de negocio, todas sus pruebas viven acá
     cielo.js    geometría pura de la galaxia — puro también, probado aparte
     vista.js    la capa DOM de la cartelera
     mapa.js     Leaflet por CDN — el único trato con red externa
     escala.js   la lectura estática
     pregunta.js la invitación
     primer-mes.js el recuerdo del primer mes
     noche-criolla.js la noche del 31.10 — un solo estado del reloj decide todo
     flores.js   el cielo de flores amarillas — el único canvas del proyecto
data/*.json  fuente de verdad, editable a mano
data/paper_cientifico/   el paper de la vista de lectura: .tex fuente, .pdf compilado
docs/        encargo-cartelera.md — el pedido de investigación de datos
scripts/     validar_datos.py — la única puerta de calidad de los datos
```

Las seis vistas se despachan por hash (`#cartelera`, `#escala-astronomica`, `#una-pregunta`,
`#flores-amarillas`, `#primer-mes` y `#noche-criolla`), y no por rutas reales, porque GitHub Pages sirve archivos estáticos:
`/una-pregunta` daría 404 al recargar. Con hash, entrar directo a cada vista funciona y los
botones de atrás y adelante del navegador son navegación de verdad.

Los datos de la cartelera son archivos JSON. Se editan a mano, se revisan con `git diff` y se
publican con `git push`. GitHub Pages sirve exactamente los archivos del repo: no hay build.
La única excepción es el PDF del paper, que se compila del `.tex` a mano y se commitea.

**El mapa es opcional por diseño, en dos niveles.** Leaflet entra por CDN con `import()`
dinámico; si no carga, su banda desaparece —y en escritorio, su columna entera— y el resto de la
pantalla queda intacto. Y si lo que falla son solo las teselas de OpenStreetMap, tras seis
fallos seguidos el mapa se retira igual, en vez de quedar como un rectángulo gris con pines
flotando sobre nada. Un fallo de red no puede leerse como "no hay teatro".

## Sobre los datos

Un dato de cartelera tiene fecha de caducidad, así que el proyecto la modela en vez de
fingir que no existe. Cada función guarda de dónde salió y cuándo se verificó, y la app
degrada la señal de confianza sola con el paso de los días: algo confirmado hace seis
semanas no puede verse igual que algo de hoy.

**Nunca se inventa nada.** No solo el precio: si ninguna fuente publica la sinopsis, va `null` y
la tarjeta no la muestra. Si nadie publica el género, va `"otro"` y la línea desaparece entera
en vez de decir "otro". Si nadie nombra al elenco, va `[]`.

### Qué certifica el semáforo de confianza

Verde, ámbar o gris, y **siempre acompañado de texto** — nunca solo color. Certifica que **la
función va a ocurrir**: fecha, hora y teatro. Para llegar a `confirmado`, una función necesita
fuente, fecha de verificación y link de compra; sin dónde comprarla se queda en `probable`, que
en pantalla se lee "verificar antes de ir".

Hoy 512 de las 625 funciones están `confirmado` (82%), 68 `probable` y 45 `sin_verificar`. El
refresco de noviembre salió casi entero de las ticketeras, que dan el link de compra; los
`sin_verificar` son de agosto y septiembre.

### Sobre el elenco: nadie decide acá quién es "conocido"

Los nombres se copian tal como los publica la fuente. Si una fuente nombra a alguien es porque
es el gancho de la obra; si no nombra a nadie, el elenco va vacío. Deducir fama sería inventar
igual que inventar un precio.

Con una consecuencia incómoda que se respeta igual: dos shows publican solo el nombre de pila de
sus comediantes ("Maribel y Jaime"), y como un nombre de pila suelto no se puede verificar, su
elenco queda vacío aunque la información exista en alguna parte.

### De dónde vienen los datos

- **Teatros:** coordenadas de [Nominatim](https://nominatim.openstreetmap.org/), contrastadas
  contra la dirección publicada. **42 de los 47 la tienen.** Los otros 5 no se pudieron ubicar
  sin dudas y quedan sin coordenada antes que con una inventada: sus funciones salen en la
  lista pero no en el mapa.
- **Cartelera, sinopsis, género y elenco:** Teleticket, Joinnus y agregadores editoriales de
  Lima (enlima, Infobae), cada dato con su `fuente_url`.
- **Lugares para cenar:** nombre, coordenada y horario de cierre de cocina salen de
  [OpenStreetMap](https://www.openstreetmap.org/).

Los precios siguen guardándose con su fuente y su fecha, y el validador los revisa, pero no se
muestran en pantalla. Lo mismo con el gasto estimado de los restaurantes.

## Material de terceros

**Hoy el repo contiene una sola imagen de terceros:** `assets/noche-criolla/evento.jpg`, el
banner promocional de *Brujería Criolla* publicado por Teleticket, que la vista `#noche-criolla`
muestra con el crédito "Imagen: Teleticket". El campo `imagen_local` sigue vacío en las 118
obras y no existe un directorio `img/`.

Cuando se agreguen afiches, esta es la política: son material promocional propiedad de cada
teatro o compañía, se guardan como miniaturas de ~300 px, siempre con crédito visible y enlace
a la fuente original, y con el único fin de identificar la obra en una cartelera personal. El
validador rechaza cualquier imagen sin su crédito.

Si sos titular de alguna y querés que se retire, abrí un issue y se saca.

## Estado

Publicado en GitHub Pages, con la interfaz reenfocada a la obra y repartida en seis vistas.

- Lógica pura con 123 pruebas, validador y esquemas de datos.
- Mapa de teatros, tira de días con el mes plegable, y por función: género, elenco, sinopsis,
  hora, teatro y link de compra.
- Cartelera real de Lima: 47 teatros, 118 obras y 625 funciones de agosto a diciembre (400 en
  noviembre, 102 en diciembre), todas con fuente y 585 con link de compra.
- 53 lugares para cenar con horario de cocina, dentro del desplegable de cada función.
- Navegación por hash entre la cartelera y las cinco vistas personales, que no dependen de
  que los datos carguen.

**El cuello de botella son los datos, no la pantalla**, y se comprobó otra vez con la sinopsis:
la tarjeta nueva no servía de nada mientras las obras no tuvieran de qué hablar. Lo que la hizo
funcionar fue la investigación. Cobertura actual: **110/118 con sinopsis, 63/118 con género,
67/118 con elenco**. Los huecos son declarados: géneros fuera del esquema ("tragicomedia",
"terror"), shows en vivo de YouTube y podcasts, o fichas que no nombran a nadie.

`npm run validar` sale con **5 avisos**, uno por cada teatro sin coordenada. Lo que falta en los
datos: esas 5 coordenadas, y que solo 10 de los 47 teatros tienen `web`. Después: filtros (por género
y distrito) y tarjeta compartible, ya diseñados en `DESIGN.md` y sin implementar.

## Dónde seguir leyendo

- **`CLAUDE.md`** — cómo trabajar en el código: comandos, arquitectura, las reglas del dato y
  las cosas que parecen bugs y no lo son. Empezá por acá.
- **`DESIGN.md`** — el sistema visual: paleta con contraste verificado, tipografía, reglas de
  composición y los pendientes conocidos.
- **`docs/encargo-cartelera.md`** — el pedido de investigación de datos: qué buscar, en qué
  fuentes, con qué esquema y qué NO hacer. Es lo que destraba el resto del proyecto.
