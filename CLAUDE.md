# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Proyecto en español: código, comentarios y datos van en español.

## Comandos

```bash
npm test                          # Vitest, 44 pruebas sobre logica.js
npx vitest run -t "confianza"     # un solo grupo de pruebas por nombre
npm run test:watch                # reejecuta al guardar

npm run validar                   # valida los JSON, reporta cobertura de confianza
python scripts/validar_datos.py --deploy   # además falla si quedan _muestra

npm run serve                     # la app en http://127.0.0.1:8000
```

Publicada en **https://raxcsu.github.io/cartelera-teatro-lima/** (GitHub Pages sirve `main`
desde la raíz; cada `git push` despliega).

**No abras `index.html` con doble clic.** `file://` no es contexto seguro: los
módulos ES y la Web Share API de la tarjeta no funcionan ahí. Siempre `http.server`
o la URL publicada.

## Arquitectura

**Sin paso de build.** Editás un JSON, refrescás el navegador, ves el cambio. Lo que
se publica a GitHub Pages es exactamente lo que hay en el repo. `package.json` y
`node_modules/` existen solo para Vitest y nunca se publican.

**Los cuatro módulos están cortados por testabilidad, no por pantalla.** Es la
decisión de arquitectura más importante del proyecto:

```
datos.js    red + localStorage + overrides   ← única puerta a los datos
logica.js   100% puro, cero imports          ← AQUÍ VIVEN LAS PRUEBAS
vista.js    DOM                              (Fase 4)
tarjeta.js  Canvas + share                   (Fase 5)
```

`logica.js` no importa nada y no toca DOM ni red. Todo lo que puede estar mal en un
cálculo vive ahí y se prueba sin navegador. **Si estás por poner lógica de negocio en
`vista.js`, va en `logica.js`.**

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
   `precio_referencial: true` (funciones) **más la fuente de la estimación**, y la interfaz la
   muestra con virgulilla y la palabra "estimada". Sin fuente, no es referencial: es inventado.
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
- **Los dos estados de vacío son distintos a propósito.** "Nada calza con estos filtros"
  y "esta cartelera está vencida" tienen distinto color, distinto texto y distinta
  acción. Si se parecieran, el modelo de confianza quedaría anulado en la práctica.
- **`costo.completo`, `costo.incluyeCena` y `costo.estimado` son tres cosas distintas.**
  `completo` = no falta ningún precio de lo que está incluido. `incluyeCena` = el plan tiene
  restaurante. `estimado` = alguno de esos precios es una estimación referencial. Un plan sin
  restaurante tiene `completo: true` e `incluyeCena: false`; confundirlos hacía que la pantalla
  dijera "los dos, con cena" en planes sin cena. Para saber qué cuenta el total, leé
  `costo.incluye`, que es la lista literal (`['entradas x2', 'cena x2 estimada']`).
- **`data/overrides.json` se aplica ENCIMA de todo refresco.** Ahí van las correcciones
  humanas. Sin eso, verificás una coordenada a mano y el siguiente refresco la borra.

## Diseño

`DESIGN.md` es la fuente de verdad visual: paleta con contraste ya verificado, tipografía
y reglas de composición. No inventes colores nuevos.

Dos reglas que se rompen sin querer:

- **El semáforo de confianza (verde/ámbar/gris) no se reusa para decoración.** Por eso el
  acento es rosa vino y no dorado: un acento ámbar haría que el aviso dejara de leerse
  como aviso.
- **Cero emoji.** Renderizan distinto en cada celular. Los iconos se dibujan con CSS.

## Estado del proyecto

Fases 0 y 1 terminadas, y publicado. En los datos hay 5 teatros, 5 obras, 5 funciones para
el sábado 22 de agosto y 53 lugares para cenar.

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

**Lo que sigue:** la interfaz completa de `DESIGN.md` (filtros, detalle con mapa por
`import()` dinámico, tarjeta compartible). El sistema de diseño está definido y falta
implementarlo. Antes conviene corregir el gasto de los locales de alta cocina vía
`overrides.json`: ver el ítem 0 de la bitácora.

**Todavía no existe** `.claude/commands/actualizar-cartelera.md`. El refresco de cartelera se
hace a mano por ahora.

## Skill routing

Cuando el pedido coincida con una skill, invocala con la herramienta Skill.

- Ideas de producto → `/office-hours`
- Arquitectura → `/plan-eng-review`
- Diseño → `/plan-design-review`
- Bugs → `/investigate`
- Probar la app → `/qa`
- Revisar el diff → `/review`
- Publicar → `/ship`
