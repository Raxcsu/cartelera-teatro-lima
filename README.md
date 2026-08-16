# Cartelera y planes de teatro — Lima

**En vivo: https://raxcsu.github.io/cartelera-teatro-lima/**

Responder *"es martes, ¿qué hacemos el sábado con S/ 150?"* en menos de un minuto,
con opciones de salida ya armadas: obra, hora, teatro, dónde comer a pie y costo total.

Proyecto personal. Sin framework, sin base de datos, sin paso de build.

## Arrancar

```bash
npm run serve                  # http://127.0.0.1:8000
```

No lo abras con doble clic: `file://` no es contexto seguro y rompe los módulos ES.

Para desarrollo:

```bash
npm install                    # solo Vitest, nunca se publica
npm test                       # 44 pruebas sobre la lógica pura
npm run validar                # valida los JSON y reporta cobertura de confianza
```

## Cómo está armado

```
index.html   styles.css
js/  datos.js    red, localStorage, overrides
     logica.js   100% funciones puras — todas las pruebas viven acá
data/*.json  fuente de verdad, editable a mano
scripts/     validar_datos.py — la única puerta de calidad de los datos
```

Los datos son archivos JSON. Se editan a mano, se revisan con `git diff` y se publican
con `git push`. GitHub Pages sirve exactamente los archivos del repo: no hay build.

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
| **Precio de entradas** | publicado por la fuente | `S/ 130` |
| **Gasto de cena** | estimación por categoría con base documentada | `~S/ 130`, y la etiqueta dice "cena x2 **estimada**" |

Toda estimación lleva `gasto_referencial: true` y la fuente de la estimación en el propio
JSON. Un número estimado nunca se presenta como precio verificado.

**Limitación conocida:** la estimación por categoría falla en los locales de alta cocina. Hay
un caso concreto en los datos actuales: uno de los restaurantes cercanos está entre los mejores
del mundo y la banda lo estima como una trattoria de barrio. Se corrige poniéndole el gasto
real en `data/overrides.json`, que sobrevive a todos los refrescos.

### De dónde vienen los datos

- **Teatros:** coordenadas de [Nominatim](https://nominatim.openstreetmap.org/), verificadas
  contra la dirección publicada.
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

**Fases 0 y 1 terminadas**, y publicado en GitHub Pages.

- Estructura, esquemas de datos, lógica pura con 44 pruebas y validador.
- Cartelera real de Lima: 5 teatros, 5 obras y 5 funciones para un sábado, todas con fuente.
- 53 lugares para cenar con horario de cocina, a menos de 600 m de un teatro.
- Interfaz mínima que arma planes completos de punta a punta.

Sigue la interfaz completa según `DESIGN.md`: filtros, detalle con mapa y tarjeta compartible.
El sistema de diseño ya está definido; falta implementarlo.

## Dónde seguir leyendo

- **`CLAUDE.md`** — cómo trabajar en el código: comandos, arquitectura, las reglas del dato y
  las cosas que parecen bugs y no lo son. Empezá por acá.
- **`DESIGN.md`** — el sistema visual: paleta con contraste verificado, tipografía y reglas de
  composición.
