# Encargo: cartelera de teatro de Lima

Este documento es el pedido completo para juntar los datos de la app. Se puede ejecutar sin
leer el resto del código: todo lo que hace falta está acá.

**Objetivo:** toda la cartelera de teatro de Lima del mes en curso. Cada obra con **de qué trata,
de qué género es y quién actúa**; cada función con su fecha y hora reales y el link para comprar
entradas.

**Lo que hay hoy:** 12 obras, 11 teatros y 47 funciones en agosto y septiembre, todas con link de
compra y 20 en `confirmado`. Cobertura de la obra: 12/12 con sinopsis, 8/12 con género, 8/12 con
elenco.

**Lo que falta:** solo 4 de los 11 teatros tienen `web`. Las coordenadas ya están completas en
los 11. Y el mes que viene hay que volver a correr todo esto.

> **Ojo si venís de una versión anterior de este documento.** El precio dejó de mostrarse en
> pantalla. Se sigue cargando, con su fuente y su fecha, y el validador lo sigue revisando —
> pero **ya no es lo que decide `confirmado`** ni lo que ve el usuario. Lo que decide ahora es
> si la función existe. Ver la sección de `confirmado` más abajo.

---

## Las tres reglas del dato

No son preferencias. Son la razón de existir del proyecto, y el validador rechaza los datos que
las violan.

### 1. Nunca inventar

Sin precio verificado va `precio_min: null`. **Jamás un número plausible.**

Lo mismo vale para fechas. Que una obra tenga temporada del 7 al 30 de agosto **no significa**
que haya función todos los días. Si no encontraste el calendario publicado, no lo derives:
carga solo las funciones que viste publicadas.

Y vale sobre todo para **el texto**, que es lo que ahora se ve en pantalla:

| Campo | Si la fuente no lo publica | Trampa que ya apareció |
|---|---|---|
| `sinopsis` | `null` | No la redactes a partir del título ni del cartel |
| `tipo` | `"otro"` | Teleticket clasifica todo bajo *Teatro*: eso es una **categoría**, no un género. Tampoco le leas "drama" a la palabra "dramaturgia" |
| `elenco` | `[]` | Un nombre de pila suelto ("Maribel", "Milagros") no es un dato verificable |

**Sobre el elenco, la regla exacta:** copiá los nombres tal como los publica la fuente. **No
juzgues quién es "conocido".** Si la fuente nombra a alguien es porque es el gancho de la obra;
si no nombra a nadie, va `[]`. Deducir fama es inventar igual que inventar un precio.

Y sí, eso tiene un costo que hay que pagar igual: en la ronda de agosto, *Nos casamos la
cagamos* publica solo "Maribel y Jaime" y quedó con `elenco: []`, aunque los apellidos existan
en alguna parte de internet. Si conseguís una **fuente citable** que los complete, entran — y la
fuente va en `_nota`. Eso mismo se hizo con *Mujer que no jode es hombre*, donde Teleticket dice
"Milagros" y Perú21 confirma "Milagros Porturas".

**Excepción reglada — la estimación con base documentada.** Un precio estimado se permite si
lleva `precio_referencial: true` más la fuente de la estimación. Sin fuente no es referencial:
es inventado. (Hoy no se muestra en pantalla, pero la regla sigue gobernando el dato.)

### 2. La fuente viaja con el dato

Cada registro lleva `fuente_url` y `verificado_el`.

El validador **falla** si falta alguno en algo marcado `confirmado`, y **falla también en
cualquier obra que traiga sinopsis o elenco sin `fuente_url`**: un texto sin procedencia es un
texto que nadie puede volver a verificar. En `probable` y `sin_verificar` no falla, pero eso no
es permiso para omitirlos.

**Todas las URLs tienen que empezar con `http://` o `https://`.** Vale para `fuente_url`,
`url_entradas` y `web`. El validador rechaza cualquier otra cosa, y la app además descarta en
el navegador todo link que no sea http(s) — así que un `mailto:`, un `www.` pelado o una ruta
relativa no fallan silenciosamente: fallan.

### 3. La confianza se calcula, no se lee

Vos ponés `confianza` + `verificado_el`; la app combina las dos y degrada el color con el paso
de los días. Por eso `verificado_el` tiene que ser la fecha en que **realmente miraste la
fuente**, no la fecha de entrega.

---

## Qué es `confirmado` y qué es `probable`

**Esto cambió de sujeto.** El semáforo certificaba el precio, y por eso `confirmado` exigía
`precio_min`. Ahora que el precio no se muestra, certifica **que la función va a ocurrir**:
esta obra, esta fecha, este teatro.

| Valor | Cuándo se usa |
|---|---|
| `confirmado` | La función está publicada en la **ticketera** (Teleticket, Joinnus) o en la **web oficial del teatro**, con fecha y hora, y **se puede comprar la entrada** |
| `probable` | La función salió de un **agregador editorial** —enlima.pe, agenda de Infobae, notas de prensa— o de un patrón de temporada ("viernes a lunes") sin calendario individual publicado |
| `sin_verificar` | No pudiste confirmar que exista |

Un `confirmado` exige las tres cosas: `fuente_url`, `verificado_el` y **`url_entradas`**. El
link de compra es la prueba más fuerte de que la función existe, así que el validador lo exige;
sin él, es `probable`. El precio ya **no** entra en esta decisión.

**Vale la pena el clic extra.** Es la diferencia entre que la app muestre ámbar ("verificar
antes de ir") o verde. En la ronda de agosto quedaron 20 de 47 en `confirmado`.

---

## Fuentes de partida

| Fuente | Para qué sirve | Confianza que otorga |
|---|---|---|
| teleticket.com.pe/teatro | Cartelera, precios, link de compra | `confirmado` |
| joinnus.com | Cartelera y precios de salas independientes | `confirmado` |
| Web propia de cada teatro | Precios, calendario de funciones, dirección | `confirmado` |
| enlima.pe/agenda/teatro | Descubrir qué se está montando | `probable` |
| Agenda cultural de Infobae Perú | Descubrir qué se está montando | `probable` |

**Método sugerido:** barrer los agregadores para *descubrir* qué obras hay, y después abrir la
ticketera o la web del teatro de cada una para *verificar* precio, fechas y link. El
descubrimiento y la verificación son dos pasos distintos.

Salas que conviene revisar directo, porque no siempre aparecen en agregadores: Teatro Británico,
Teatro Julieta, Asociación de Artistas Aficionados, Centro Cultural Ricardo Palma, Teatro
Municipal, Teatro Segura, Centro Cultural PUCP, ICPNA, Teatro La Plaza, Microteatro Lima.

---

## Los tres archivos

Los datos viven en `data/`. Cada archivo tiene su bloque `_esquema` adentro, que es la
referencia canónica; esto es la versión legible.

### `data/teatros.json` → clave `teatros`

```json
{
  "id": "auditorio-del-britanico-sede-miraflores",
  "nombre": "Auditorio del Británico, sede Miraflores",
  "direccion": "Malecón Balta 740",
  "distrito": "Miraflores",
  "lat": -12.1236,
  "lng": -77.03274,
  "web": null,
  "como_llegar": null,
  "fuente_url": "https://nominatim.openstreetmap.org/",
  "verificado_el": "2026-08-16",
  "_nota": "de dónde salió, qué falta verificar. Informativa: la app no la usa."
}
```

- `web` — **hoy lo tienen 4 de 11 teatros.** Llenarlo es parte del encargo.
- `lat` / `lng` — geocodificar con Nominatim y **verificar contra la dirección**. Una coordenada
  fuera de la caja de Lima (lat −12.60 a −11.60, lng −77.35 a −76.60) hace fallar el validador.
- Ojo con las sedes múltiples: "el Británico" tiene varias en Miraflores y no todas tienen
  auditorio. Si no estás seguro, dejá la coordenada y decilo en `_nota`.

### `data/obras.json` → clave `obras`

```json
{
  "id": "cascaras-2026",
  "titulo": "Cáscaras",
  "sinopsis": null,
  "tipo": "otro",
  "elenco": [],
  "idioma": "español",
  "duracion_min": null,
  "clasificacion": null,
  "temporada_inicio": "2026-08-10",
  "temporada_fin": "2026-08-31",
  "imagen_local": null,
  "imagen_credito": null,
  "fuente_url": "https://enlima.pe/agenda/teatro",
  "verificado_el": "2026-08-16"
}
```

**Los tres campos de abajo son ahora el corazón del encargo.** La tarjeta de cada función los
muestra en este orden —género, elenco, sinopsis— y sin ellos solo sabe decir el título y la
hora, que no alcanza para decidir si ir. Conseguirlos es lo que hace que la pantalla sirva.

- `sinopsis` — de qué trata, resumido de la fuente. **Se ve en pantalla**, debajo del elenco,
  recortada a 3 líneas con un "seguir leyendo" que la despliega. Apuntá a 2–4 oraciones: hay
  sitio, y la primera es la que se lee. Si podés, arrancá por autor y director cuando la fuente
  los publique ("De César Vega Herrera, dir. Alberto Ísola"), que es contexto útil y corto.
  Sin fuente que la publique, `null`, y la tarjeta simplemente no la muestra.
- `tipo` — exactamente uno de: `comedia`, `drama`, `musical`, `danza`, `infantil`, `otro`.
  **Se ve en pantalla**, y es lo primero de la línea de datos: "comedia · 20:00 · Teatro".
  Con `otro` la palabra no aparece. **La trampa está acá:** Teleticket clasifica todo bajo
  *Teatro*, y eso es una categoría, no un género. Lo que sí vale es cuando la propia descripción
  dice qué es — "una comedia teatral", "un show de stand-up", "una noche de humor".
- `elenco` — lista de nombres, `[]` si la fuente no publica ninguno. **Se ve en pantalla** como
  "Con Aldo Miyashiro, Lucho Cáceres, Ebelin Ortiz y 3 más"; la tarjeta muestra 3 nombres y el
  popup del mapa 2. Copialos tal como aparecen, sin juzgar quién es conocido, y **sin apellido
  no entran** (ver la Regla 1).
- `idioma` — obligatorio. Importa de verdad: ICPNA y el Británico montan obras en inglés.
- `duracion_min` — **tiene efecto real, no es un adorno.** La app calcula con ella a qué hora
  termina la función y con eso decide qué restaurantes siguen con la cocina abierta. Si va
  `null`, el código **asume 2 horas** y lo declara en pantalla ("suponiendo unas 2 h de
  función"). Conseguirla reemplaza un supuesto por un dato: vale el clic extra.
- `imagen_local` — ruta local o `null`. **Nunca una URL externa**, el validador la rechaza. Si
  ponés imagen, `imagen_credito` es obligatorio (es la mitigación de derechos de autor).

### `data/funciones.json` → clave `funciones`

```json
{
  "id": "cascaras-2026-auditorio-del-britanico-sede-miraflores-2026-08-22-2030",
  "obra_id": "cascaras-2026",
  "teatro_id": "auditorio-del-britanico-sede-miraflores",
  "fecha": "2026-08-22",
  "hora": "20:30",
  "precio_min": 30,
  "precio_max": 50,
  "precio_referencial": false,
  "estado": "disponible",
  "url_entradas": null,
  "fuente_url": "https://enlima.pe/agenda/teatro",
  "verificado_el": "2026-08-16",
  "confianza": "probable",
  "_nota": "Precio de agregador editorial, no de la web oficial ni del checkout."
}
```

- **Una función por fecha y hora.** Si una obra va jueves a domingo durante tres semanas y lo
  verificaste, son ~12 registros, no uno. Esto es lo que llena la vista de mes.
- `hora` — `HH:MM` en 24h, hora de Lima.
- `url_entradas` — **hoy lo tienen las 47.** Es el link directo a comprar, y desde el cambio del
  semáforo es además **requisito de `confirmado`**: sin él, la función se queda en `probable`.
- `precio_min` / `precio_max` — **ya no se ven en pantalla**, pero se siguen cargando con las
  mismas reglas de siempre: el rango publicado tal cual, `precio_max: null` cuando la fuente
  dice "desde" y no da techo, `precio_min: null` cuando no hay precio. Nunca un número
  plausible. Es dato archivado con su fuente, no dato muerto: si vuelve a pantalla, vuelve de
  acá, y un número inventado hoy sería una mentira publicada mañana. Prioridad baja frente a
  sinopsis, género y elenco.
- `estado` — `disponible`, `agotada` o `cancelada`. Las dos últimas no se muestran en la app.
- `obra_id` y `teatro_id` tienen que existir en sus archivos. El validador lo comprueba.

---

## IDs: derivados del contenido, nunca de un contador

Si los IDs fueran correlativos, cada refresco de la cartelera los barajaría: los guardados
apuntarían a obras equivocadas y el `git diff` sería ilegible.

Todos salen de `slug()`, que quita tildes, pasa a minúsculas, cambia todo lo que no es `a-z0-9`
por guiones, y **corta a 60 caracteres en frontera de palabra**.

```
slug("Auditorio del Británico")  →  "auditorio-del-britanico"

teatro   = slug(nombre)
obra     = slug(titulo) + "-" + año(temporada_inicio)
funcion  = obra_id + "-" + teatro_id + "-" + fecha + "-" + hhmm
lugar    = slug(nombre) + "-" + slug(distrito)
```

**No hace falta que los aciertes de memoria.** El validador recalcula cada ID y, si no coincide,
te dice cuál era: `el id no es determinista. Deberia ser 'cascaras-2026'`. Entregá, corré el
script, corregí lo que marque.

> Nota para quien toque el código: `slug()` está implementado **dos veces**, en `js/logica.js` y
> en `scripts/validar_datos.py`, con el mismo `SLUG_MAX = 60`. Si cambiás uno, cambiá el otro o
> los IDs del script y de la app dejan de coincidir.

---

## Qué NO hacer

1. **No inventes precios.** Ni redondeados, ni "más o menos así", ni sacados de una obra
   parecida. Sin precio → `null`.
2. **No escribas una sinopsis a partir del título.** Es la versión nueva de la trampa anterior,
   y es peor: un párrafo inventado se lee tan bien como uno real. Sin fuente → `null`.
3. **No deduzcas el género.** Ni del título, ni del cartel, ni de la categoría "Teatro" de la
   ticketera. Sin fuente que lo diga → `otro`.
4. **No completes apellidos de memoria.** Si la fuente dice "Milagros" y vos creés saber el
   apellido, o conseguís una fuente citable o el nombre no entra.
5. **No derives fechas de función del rango de temporada.** Es la trampa más fácil de este
   encargo y produce datos que se ven perfectos y son falsos.
6. **No pongas URLs de imágenes externas** en `imagen_local`. Es ruta local o `null`.
7. **No marques `confirmado`** una función sin `url_entradas`.
8. **No pongas `verificado_el` en el futuro.** El validador lo rechaza.
9. **No toques `data/overrides.json`.** Ahí van correcciones humanas que se aplican encima de
   cada refresco; si las pisás, se pierden.
10. **No borres los bloques `_esquema`, `_reglas` ni `_reglas_del_texto`** de los JSON. Son
    parte del archivo.

---

## Entrega y validación

Entregá los tres archivos completos, con su bloque `_esquema` intacto y los registros dentro de
su clave (`teatros`, `obras`, `funciones`).

```bash
python scripts/validar_datos.py
```

Sale con código distinto de cero si hay errores y los lista uno por uno. Además imprime **dos**
tablas de cobertura, que son las métricas reales del encargo. Así quedó la ronda de agosto:

```
  COBERTURA DE CONFIANZA          COBERTURA DE LA OBRA
  ------------------------        ------------------------
  confirmado     20   43%         sin sinopsis    0    0%
  probable       27   57%         sin genero      4   33%
  sin_verificar   0    0%         sin elenco      4   33%
  TOTAL          47               TOTAL          12
```

La segunda tabla es la nueva, y es la que dice si la pantalla tiene algo que mostrar: una obra
sin sinopsis, sin género y sin elenco produce una tarjeta que solo sabe decir el título y la
hora. **El encargo sale bien si las dos tablas mejoran** — más funciones en `confirmado`, y
menos huecos de obra. Con la salvedad de siempre: un hueco que ninguna fuente publica es un
hueco correcto y tiene que quedarse así.

Antes de publicar se corre además `python scripts/validar_datos.py --deploy`, que falla si
quedan registros de andamiaje (`_muestra: true`).

## Definición de terminado

- [ ] Todas las funciones del mes en curso que se pudieron verificar, cada una con su fecha y hora
- [ ] `url_entradas` lleno en toda función que se venda por internet
- [ ] **`sinopsis` en toda obra cuya fuente la publique** — es lo que se lee en la tarjeta
- [ ] **`tipo` real en toda obra cuya fuente nombre el género**, y `otro` donde nadie lo nombra
- [ ] **`elenco` en toda obra cuya fuente publique nombres completos**, y `[]` donde no
- [ ] `lat`/`lng` en todo teatro, o su función no aparece en el mapa
- [ ] `web` lleno en todo teatro que tenga sitio
- [ ] Al menos una parte de las funciones en `confianza: "confirmado"`, con `url_entradas`
- [ ] `python scripts/validar_datos.py` sale sin errores
- [ ] Cada registro nuevo lleva `fuente_url` y un `verificado_el` que es la fecha real de consulta
- [ ] Los huecos que quedan son huecos **declarados**, no rellenos: por cada `null`, `[]` u
      `otro`, la `_nota` dice que ninguna fuente lo publica
