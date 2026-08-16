# Cartelera y planes de teatro — Lima

**En vivo: https://raxcsu.github.io/cartelera-teatro-lima/**

La cartelera de teatro de Lima del mes, en una pantalla: mapa de los teatros, calendario,
y por cada función su hora y su precio tal como lo publica la fuente — con el link de compra
en cuanto esa fuente lo dé. Dónde cenar cerca queda a un toque de distancia, en segundo plano.

Proyecto personal. Sin framework, sin base de datos, sin paso de build.

## Arrancar

```bash
npm run serve                  # http://127.0.0.1:8000
```

No lo abras con doble clic: `file://` no es contexto seguro y rompe los módulos ES.

Para desarrollo:

```bash
npm install                    # solo Vitest, nunca se publica
npm test                       # 79 pruebas sobre la lógica pura
npm run validar                # valida los JSON y reporta cobertura de confianza
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

**El mapa es opcional por diseño.** Leaflet entra por CDN con `import()` dinámico; si no carga,
su banda desaparece y el resto de la pantalla queda intacto. Un fallo de red no puede leerse
como "no hay teatro".

## Sobre los datos

Un dato de cartelera tiene fecha de caducidad, así que el proyecto la modela en vez de
fingir que no existe. Cada función guarda de dónde salió y cuándo se verificó, y la app
degrada la señal de confianza sola con el paso de los días: un precio confirmado hace seis
semanas no puede verse igual que uno de hoy.

**Nunca se inventa un precio.** Si no se pudo verificar, se muestra como no verificado.
Es preferible a llegar al teatro con un número que ya cambió.

### Precio verificado y gasto estimado no son lo mismo

La app distingue dos cosas y las muestra distinto:

| | De dónde sale | Cómo se ve |
|---|---|---|
| **Precio de entradas** | publicado por la fuente, tal cual | `S/ 30 – 50`, `desde S/ 35` |
| **Gasto de cena** | estimación por categoría con base documentada | `~S/ 35 – 60 por persona`, y la etiqueta dice "cena x2 **estimada**" |

El precio grande es el de **una entrada**, no el total para dos: así coincide con el número que
muestra la ticketera. Si la fuente publica "desde 35" y no da techo, la app dice "desde S/ 35"
en vez de inventarle un máximo.

Toda estimación lleva `gasto_referencial: true` y la fuente de la estimación en el propio
JSON. Un número estimado nunca se presenta como precio verificado.

**Limitación conocida:** la estimación por categoría falla en los locales de alta cocina. Hay
un caso concreto en los datos actuales: uno de los restaurantes cercanos está entre los mejores
del mundo y la banda lo estima como una trattoria de barrio. Se corrige poniéndole el gasto
real en `data/overrides.json`, que sobrevive a todos los refrescos.

### De dónde vienen los datos

- **Teatros:** coordenadas de [Nominatim](https://nominatim.openstreetmap.org/), contrastadas
  contra la dirección publicada. **Dos de los cinco todavía no están confirmadas** y lo dicen
  en su propia nota dentro de `data/teatros.json`: el Británico tiene varias sedes en
  Miraflores y no se sabe cuál tiene el auditorio, y del Teatro Julieta Nominatim resolvió el
  pasaje pero no el número, así que la coordenada es el centro de la cuadra y no la puerta.
- **Cartelera:** agregadores editoriales de Lima. Como no son la web oficial del teatro ni el
  checkout de la ticketera, **toda función está marcada `probable`**, no `confirmado`. Por eso
  la app dice "verificar antes de ir" en todas.
- **Lugares para cenar:** nombre, coordenada y horario de cierre de cocina salen de
  [OpenStreetMap](https://www.openstreetmap.org/). El gasto es estimado.

## Material de terceros

**Hoy el repo no contiene ninguna imagen de terceros.** El campo `imagen_local` está vacío en
todas las obras y `img/` no tiene archivos.

Cuando se agreguen afiches, esta es la política: son material promocional propiedad de cada
teatro o compañía, se guardan como miniaturas de ~300 px, siempre con crédito visible y enlace
a la fuente original, y con el único fin de identificar la obra en una cartelera personal. El
validador rechaza cualquier imagen sin su crédito.

Si sos titular de alguna y querés que se retire, abrí un issue y se saca.

## Estado

Publicado en GitHub Pages, con la interfaz reenfocada al teatro.

- Lógica pura con 79 pruebas, validador y esquemas de datos.
- Mapa de teatros, calendario del mes, lista por día y precio de entrada por función.
- Cartelera real de Lima: 5 teatros, 5 obras y 5 funciones para un sábado, todas con fuente.
- 53 lugares para cenar con horario de cocina, dentro del desplegable de cada función.

**El cuello de botella son los datos, no la pantalla.** Las 5 funciones son todas del mismo día,
ninguna tiene link de compra y ningún teatro tiene web cargada, así que el botón "Comprar
entradas" todavía no aparece: aparece solo cuando el dato exista. `docs/encargo-cartelera.md`
es el pedido de investigación que cierra ese hueco.

Después: filtros y tarjeta compartible, ya diseñados en `DESIGN.md` y sin implementar.

## Dónde seguir leyendo

- **`CLAUDE.md`** — cómo trabajar en el código: comandos, arquitectura, las reglas del dato y
  las cosas que parecen bugs y no lo son. Empezá por acá.
- **`DESIGN.md`** — el sistema visual: paleta con contraste verificado, tipografía, reglas de
  composición y los pendientes conocidos.
- **`docs/encargo-cartelera.md`** — el pedido de investigación de datos: qué buscar, en qué
  fuentes, con qué esquema y qué NO hacer. Es lo que destraba el resto del proyecto.
