# Cartelera y planes de teatro — Lima

**En vivo: https://raxcsu.github.io/cartelera-teatro-lima/**

La cartelera de teatro de Lima del mes, en una pantalla: mapa de los teatros, tira de días, y
por cada función **de qué trata la obra, de qué género es y quién actúa**, con su hora, su
teatro y el link de compra. Dónde cenar cerca queda a un toque de distancia, en segundo plano.

El precio se guarda con su fuente pero no se muestra: la pregunta que contesta la app es
"¿qué obra es y vale la pena?", no "¿cuánto sale?".

En el celular va todo apilado; desde 900px de ancho se abre en dos columnas, con el mapa
grande a la izquierda y el calendario sobre la lista a la derecha.

Proyecto personal. Sin framework, sin base de datos, sin paso de build.

## Arrancar

```bash
npm run serve                  # http://127.0.0.1:8000
```

No lo abras con doble clic: `file://` no es contexto seguro y rompe los módulos ES.

Para desarrollo:

```bash
npm install                    # solo Vitest, nunca se publica
npm test                       # 80 pruebas sobre la lógica pura
npm run validar                # valida los JSON y reporta cobertura de confianza y de obra
```

## Cómo está armado

```
index.html   styles.css
js/  datos.js    red, localStorage, overrides
     logica.js   100% funciones puras — todas las pruebas viven acá
     vista.js    toda la capa DOM
     mapa.js     Leaflet por CDN — el único trato con red externa
data/*.json  fuente de verdad, editable a mano
docs/        encargo-cartelera.md — el pedido de investigación de datos
scripts/     validar_datos.py — la única puerta de calidad de los datos
```

Los datos son archivos JSON. Se editan a mano, se revisan con `git diff` y se publican
con `git push`. GitHub Pages sirve exactamente los archivos del repo: no hay build.

**El mapa es opcional por diseño, en dos niveles.** Leaflet entra por CDN con `import()`
dinámico; si no carga, su banda desaparece —y en escritorio, su columna entera— y el resto de la
pantalla queda intacto. Y si lo que falla son solo las teselas de CARTO, la capa cambia sola a
OpenStreetMap en vez de dejar un rectángulo gris. Un fallo de red no puede leerse como "no hay
teatro".

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

Hoy 20 de las 47 funciones están `confirmado` y 27 `probable`.

### Sobre el elenco: nadie decide acá quién es "conocido"

Los nombres se copian tal como los publica la fuente. Si una fuente nombra a alguien es porque
es el gancho de la obra; si no nombra a nadie, el elenco va vacío. Deducir fama sería inventar
igual que inventar un precio.

Con una consecuencia incómoda que se respeta igual: dos shows publican solo el nombre de pila de
sus comediantes ("Maribel y Jaime"), y como un nombre de pila suelto no se puede verificar, su
elenco queda vacío aunque la información exista en alguna parte.

### De dónde vienen los datos

- **Teatros:** coordenadas de [Nominatim](https://nominatim.openstreetmap.org/), contrastadas
  contra la dirección publicada. **Los 11 ya la tienen**, así que todas las funciones aparecen
  en el mapa.
- **Cartelera, sinopsis, género y elenco:** Teleticket, Joinnus y agregadores editoriales de
  Lima (enlima, Infobae), cada dato con su `fuente_url`.
- **Lugares para cenar:** nombre, coordenada y horario de cierre de cocina salen de
  [OpenStreetMap](https://www.openstreetmap.org/).

Los precios siguen guardándose con su fuente y su fecha, y el validador los revisa, pero no se
muestran en pantalla. Lo mismo con el gasto estimado de los restaurantes.

## Material de terceros

**Hoy el repo no contiene ninguna imagen de terceros.** El campo `imagen_local` está vacío en
todas las obras y `img/` no tiene archivos.

Cuando se agreguen afiches, esta es la política: son material promocional propiedad de cada
teatro o compañía, se guardan como miniaturas de ~300 px, siempre con crédito visible y enlace
a la fuente original, y con el único fin de identificar la obra en una cartelera personal. El
validador rechaza cualquier imagen sin su crédito.

Si sos titular de alguna y querés que se retire, abrí un issue y se saca.

## Estado

Publicado en GitHub Pages, con la interfaz reenfocada a la obra.

- Lógica pura con 80 pruebas, validador y esquemas de datos.
- Mapa de teatros, tira de días con el mes plegable, y por función: género, elenco, sinopsis,
  hora, teatro y link de compra.
- Cartelera real de Lima: 11 teatros, 12 obras y 47 funciones en agosto y septiembre, todas con
  fuente y todas con link de compra.
- 53 lugares para cenar con horario de cocina, dentro del desplegable de cada función.

**El cuello de botella son los datos, no la pantalla**, y se acaba de comprobar otra vez: la
tarjeta nueva no servía de nada mientras 9 de 12 obras no tuvieran sinopsis. Lo que la hizo
funcionar fue la investigación. Cobertura actual: **12/12 con sinopsis, 8/12 con género, 8/12
con elenco**, y los huecos son huecos que ninguna fuente publica.

Los 11 teatros tienen coordenadas, así que `npm run validar` sale con **cero avisos**. Lo que
falta en los datos es menor: solo 4 de los 11 teatros tienen `web`. Después: filtros (por género
y distrito) y tarjeta compartible, ya diseñados en `DESIGN.md` y sin implementar.

## Dónde seguir leyendo

- **`CLAUDE.md`** — cómo trabajar en el código: comandos, arquitectura, las reglas del dato y
  las cosas que parecen bugs y no lo son. Empezá por acá.
- **`DESIGN.md`** — el sistema visual: paleta con contraste verificado, tipografía, reglas de
  composición y los pendientes conocidos.
- **`docs/encargo-cartelera.md`** — el pedido de investigación de datos: qué buscar, en qué
  fuentes, con qué esquema y qué NO hacer. Es lo que destraba el resto del proyecto.
