# Fotos de "Nuestro primer mes"

Las fotos reales del 26.09.2026 van en esta carpeta, con estos nombres exactos:

```
01.jpg  02.jpg  03.jpg  04.jpg  05.jpg  06.jpg  07.jpg
```

Hoy están las 7, en el orden del día. `02`, `04` y `07` además aparecen en las polaroids
del mapa (el cafecito, el Parque de las Leyendas y La Mariposario).

- JPG de 1600px como máximo en el lado largo. Una foto del celular sin achicar pesa 3 a 5 MB,
  y la galería carga todas.
- El marco es vertical (4:5) y la foto se recorta al centro para llenarlo.
- Un archivo que falta deja su marco de la galería con la leyenda "Foto 0N · por agregar", y
  no rompe nada. En la polaroid del mapa queda el fondo liso, sin leyenda.

Para cambiar los nombres, sumar fotos o escribir la nota manuscrita de cada una, se edita
`RECUERDO.fotos` en `js/primer-mes.js`. Si un lugar revelado del mapa necesita foto, va en
`RECUERDO.momentos[n].lugar.foto`.

**Ojo al renombrar `02`, `04` o `07`:** están escritas dos veces, en `RECUERDO.fotos[].archivo`
(la galería) y en `RECUERDO.momentos[].lugar.foto` (la polaroid del mapa). Hay que cambiar las
dos, o una de las dos queda vacía.

**Esta carpeta se publica.** El repo es público y cada push despliega en GitHub Pages.
