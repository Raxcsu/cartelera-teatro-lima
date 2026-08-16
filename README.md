# Cartelera y planes de teatro — Lima

Responder *"es martes, ¿qué hacemos el sábado con S/ 150?"* en menos de un minuto,
con opciones de salida ya armadas: obra, hora, teatro, dónde comer a pie y costo total.

Proyecto personal. Sin framework, sin base de datos, sin paso de build.

## Arrancar

```bash
python -m http.server 8000     # http://127.0.0.1:8000
```

No lo abras con doble clic: `file://` rompe los módulos ES y el botón de compartir.

Para desarrollo:

```bash
npm install                    # solo Vitest
npm test                       # 41 pruebas sobre la lógica pura
python scripts/validar_datos.py
```

## Cómo está armado

```
index.html   styles.css
js/  datos.js    red, localStorage, overrides
     logica.js   100% funciones puras — todas las pruebas viven acá
data/*.json  fuente de verdad, editable a mano
scripts/     importador y validador
```

Los datos son archivos JSON. Se editan a mano o con `/actualizar-cartelera`, se revisan
con `git diff` y se publican con `git push`.

## Sobre los datos

Un dato de cartelera tiene fecha de caducidad, así que el proyecto la modela en vez de
fingir que no existe. Cada función guarda de dónde salió y cuándo se verificó, y la app
degrada la señal de confianza sola con el paso de los días.

**Nunca se inventa un precio.** Si no se pudo verificar, se muestra como no verificado.
Es preferible a llegar al teatro con un número que ya cambió.

## Material de terceros

Los afiches de las obras son material promocional propiedad de cada teatro o compañía.
Se almacenan como miniaturas, siempre con crédito visible y enlace a la fuente original,
con el único fin de identificar la obra en una cartelera personal.

Si sos el titular de alguno y querés que se retire, abrí un issue y se saca.

## Estado

Fase 0 terminada: estructura, esquemas de datos, lógica con pruebas y validador.
Sigue la Fase 1, que es investigar la cartelera real y demostrar que alcanza para armar
tres planes decentes. Ver `CLAUDE.md`.
