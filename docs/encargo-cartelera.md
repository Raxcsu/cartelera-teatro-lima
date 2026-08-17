# Encargo: cartelera de teatro de Lima

Este documento es el pedido completo para juntar los datos de la app. Se puede ejecutar sin
leer el resto del código: todo lo que hace falta está acá.

**Objetivo:** toda la cartelera de teatro de Lima del mes en curso. Cada obra, cada función con
su fecha y hora reales, el precio publicado y el link para comprar entradas.

**Lo que hay hoy:** 5 obras, 5 teatros y 5 funciones, todas del mismo día. Ninguna función tiene
link de compra y ninguna llega a `confirmado`. Este encargo cierra esos tres huecos.

---

## Las tres reglas del dato

No son preferencias. Son la razón de existir del proyecto, y el validador rechaza los datos que
las violan.

### 1. Nunca inventar

Sin precio verificado va `precio_min: null` y `confianza: "sin_verificar"`. **Jamás un número
plausible.** Un precio inventado es peor que ningún precio: no se distingue de uno real, y
alguien puede llegar al teatro con la plata justa.

Lo mismo vale para fechas. Que una obra tenga temporada del 7 al 30 de agosto **no significa**
que haya función todos los días. Si no encontraste el calendario publicado, no lo derives:
carga solo las funciones que viste publicadas.

**Excepción reglada — la estimación con base documentada.** Una estimación sí se permite si
lleva `precio_referencial: true` **más la fuente de la estimación** en `fuente_url`. La app lo
muestra con virgulilla: `~S/ 50`. Sin fuente no es referencial: es inventado.

### 2. La fuente viaja con el dato

Cada registro lleva `fuente_url` y `verificado_el`.

El validador **falla** si falta alguno en algo marcado `confirmado`. En `probable` y
`sin_verificar` no falla, pero eso no es permiso para omitirlos: un dato sin origen no se
puede volver a verificar, y esa es la única forma de que suba de nivel más adelante.

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

Acá es donde este encargo agrega más valor, porque hoy **ninguna función llega a
`confirmado`**.

| Valor | Cuándo se usa |
|---|---|
| `confirmado` | El precio salió de la **web oficial del teatro** o del **checkout de la ticketera** (Teleticket, Joinnus). Es el precio que vas a pagar |
| `probable` | El precio salió de un **agregador editorial**: enlima.pe, agenda cultural de Infobae, notas de prensa. Suele estar bien, pero nadie lo garantiza |
| `sin_verificar` | No encontraste precio. Va junto con `precio_min: null` |

Un `confirmado` exige las cuatro cosas: `precio_min`, `fuente_url`, `verificado_el` y que la
fuente sea oficial. Si te falta una, es `probable`.

**Vale la pena el clic extra.** Subir una función de `probable` a `confirmado` es la diferencia
entre que la app muestre ámbar ("verificar antes de ir") o verde. Hoy todo está en ámbar.

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

- `web` — **hoy está en `null` en los 5 teatros.** Llenarlo es parte del encargo.
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

- `tipo` — exactamente uno de: `comedia`, `drama`, `musical`, `danza`, `infantil`, `otro`.
  Si la fuente no publica el género, va `otro`. No lo deduzcas del título.
  **Se ve en pantalla:** la tarjeta que abre un pin del mapa muestra el género debajo del
  título de la obra, y con `otro` esa línea desaparece entera en vez de decir "otro". Como con
  `duracion_min`, conseguirlo de la fuente cambia un hueco por un dato. Hoy las 5 obras están
  en `otro` porque ninguna fuente lo publicó.
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
- `url_entradas` — **hoy está en `null` en las 5.** Es el link directo a comprar. Prioridad alta
  del encargo.
- `precio_min` / `precio_max` — la app muestra el rango publicado tal cual:
  - ambos con valor → `S/ 30 – 50`
  - `precio_max: null` → `desde S/ 35` (usalo cuando la fuente dice "desde")
  - iguales → `S/ 40`
  - `precio_min: null` → `sin precio`
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
   parecida. Sin precio → `null` + `sin_verificar`.
2. **No derives fechas de función del rango de temporada.** Es la trampa más fácil de este
   encargo y produce datos que se ven perfectos y son falsos.
3. **No pongas URLs de imágenes externas** en `imagen_local`. Es ruta local o `null`.
4. **No marques `confirmado`** lo que salió de un agregador editorial, por confiable que parezca.
5. **No pongas `verificado_el` en el futuro.** El validador lo rechaza.
6. **No toques `data/overrides.json`.** Ahí van correcciones humanas que se aplican encima de
   cada refresco; si las pisás, se pierden.
7. **No borres los bloques `_esquema` ni `_reglas`** de los JSON. Son parte del archivo.

---

## Entrega y validación

Entregá los tres archivos completos, con su bloque `_esquema` intacto y los registros dentro de
su clave (`teatros`, `obras`, `funciones`).

```bash
python scripts/validar_datos.py
```

Sale con código distinto de cero si hay errores y los lista uno por uno. Además imprime la
cobertura de confianza, que es la métrica real del encargo:

```
  COBERTURA DE CONFIANZA
  --------------------------------------------
  confirmado        0    0%
  probable          5  100%  ####################
  sin_verificar     0    0%
  sin precio        0
  TOTAL             5
```

**Eso es el punto de partida.** El encargo sale bien si al terminar hay muchas más funciones y
una parte real de ellas dice `confirmado`.

Antes de publicar se corre además `python scripts/validar_datos.py --deploy`, que falla si
quedan registros de andamiaje (`_muestra: true`).

## Definición de terminado

- [ ] Todas las funciones del mes en curso que se pudieron verificar, cada una con su fecha y hora
- [ ] `url_entradas` lleno en toda función que se venda por internet
- [ ] `web` lleno en todo teatro que tenga sitio
- [ ] Al menos una parte de las funciones en `confianza: "confirmado"`, con fuente oficial
- [ ] `python scripts/validar_datos.py` sale sin errores
- [ ] Cada registro nuevo lleva `fuente_url` y un `verificado_el` que es la fecha real de consulta
