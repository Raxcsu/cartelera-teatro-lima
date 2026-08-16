# DESIGN.md — teatro

Sistema de diseño derivado de `/plan-design-review` el 2026-08-16.
Maquetas de referencia: `~/.gstack/projects/teatro/designs/teatro-v1-20260816/`

**El brief, en las palabras del usuario:** *"tonalidades pastel rosa para que ella pueda
escoger. Estilo elegante y formal pero para una chica abogada con estilo."*

Traducción a reglas: rosa que no sea infantil, serif de alto contraste, texto cálido en
vez de negro, y restricción en todo lo demás. **Aquí la elegancia es cuánto quitas.**

---

## Paleta

```css
:root{
  --bg:      #fdf8f7;  /* fondo, blanco rosado */
  --surface: #ffffff;  /* tarjetas */
  --ink:     #3a2a2e;  /* texto principal, borgoña oscuro. NUNCA negro puro */
  --ink2:    #7d666c;  /* texto secundario   — 5.0:1 sobre --bg, pasa AA */
  --ink3:    #7f6a70;  /* texto terciario    — 4.6:1 sobre --bg, pasa AA */
  --accent:  #a35267;  /* rosa vino: acciones, badges, acentos */
  --accent-bg:#f7e9ea; /* fondo del bloque "por qué es el #1" */
  --line:    #f0e2e0;  /* separadores */
  --hair:    #e6d3d0;  /* bordes finos */
}
```

**Nunca uses `#a08e93` para texto.** Fue el gris original y mide 2.94:1 sobre el fondo:
falla WCAG AA, que exige 4.5:1. Por eso `--ink3` es #7f6a70.

### El semáforo de confianza es intocable

Estos tres colores comunican fiabilidad del dato y **no pueden reusarse para decoración**.
Si el acento de la app fuera ámbar, el aviso de "verificar antes de ir" dejaría de leerse
como aviso. Por eso el acento es rosa vino y no dorado.

```css
--ok:  #4f8a63;  /* verde salvia — confirmado hace menos de 7 días */
--mid: #c28b3c;  /* ámbar        — confirmado hace 7 a 21 días, o "probable" */
--no:  #a3969a;  /* gris cálido  — sin verificar */
```

## Tipografía

```css
--serif:'Bodoni MT','Didot',Georgia,'Times New Roman',serif;   /* títulos y precios */
--sans:'Segoe UI',system-ui,-apple-system,sans-serif;          /* todo lo demás */
```

Sin fuentes externas: no hay build, y una fuente por CDN es una petición de red que
puede fallar justo cuando ella abre el link con mala señal.

El serif de alto contraste es lo que hace el trabajo de "formal y con estilo". **Los
precios van en serif, no en sans**: `S/ 148` en Bodoni se lee como una cifra considerada
y no como un dato de sistema.

| Uso | Regla |
|---|---|
| Título de pantalla | serif 30px / 1.1 |
| Título de obra, plan #1 | serif 23px / 1.13 |
| Título de obra, planes 2 y 3 | serif 17px / 1.2 |
| Precio destacado | serif 27px |
| Metadatos | sans 12.5px / 1.55, color `--ink2` |
| Etiquetas de sección | sans 10.5px, `letter-spacing:.11em`, mayúsculas, `--ink3` |

## Reglas de composición

1. **El plan #1 no se ve como los otros dos.** Lleva afiche grande, tarjeta con borde,
   badge de orden y acciones propias. `puntuarFuncion` ordena en la lógica; **la pantalla
   tiene que mostrar que ordenó**.
2. **El ranking se explica.** Bajo el plan #1 va una línea que dice por qué ganó: *"es el
   más cerca de casa y el único con precio confirmado hoy"*. Un orden sin motivo se lee
   como arbitrario.
3. **El precio es escaneable sin leer.** Debe poder compararse los tres precios de un
   vistazo, porque la pregunta del producto es *"¿qué hacemos con S/ 150?"*.
4. **Los afiches mandan.** Son el único activo visual del proyecto. Nunca por debajo de
   56px de ancho, y en el plan #1 nunca por debajo de 118px.
5. **Nada de emoji.** Renderizan distinto en cada celular y rompen la tipografía. Los
   iconos se dibujan con CSS.
6. **Los dos estados de vacío son visualmente distintos.** Filtro estrecho usa el rosa
   normal y ofrece ampliar el filtro. Datos vencidos cambia a fondo cálido, marca ámbar y
   ofrece actualizar. Si se parecieran, el modelo de confianza quedaría anulado.

## Accesibilidad, verificada no supuesta

- Todo texto sobre `--bg` mide **4.5:1 o más**. Comprobado por cálculo, no a ojo.
- **Área táctil mínima 44×44px.** Los chips de filtro estaban en 33px y suben a 44.
- El estado de confianza **nunca depende solo del color**: el punto siempre va con texto
  ("confirmado hace 12 días", "cena sin precio verificado").
- Contraste a verificar cuando exista código: foco de teclado visible en todo lo tocable.

## La tarjeta compartible

**Ficha, no invitación.** Decisión explícita: la tarjeta lleva solo información bien
compuesta. El mensaje personal lo escribe él al mandarla por WhatsApp. Una frase fija
impresa en la imagen competiría con eso y se gastaría de tanto repetirla.

- **1080×1080, cuadrada.** No 4:5. El cuadrado nunca se recorta en la vista previa de
  WhatsApp, y cerrar el formato elimina el espacio muerto en vez de rellenarlo.
- Estructura: fecha, título en serif grande, luego dos columnas (afiche a la izquierda,
  datos a la derecha en pares etiqueta/valor), precio abajo a la derecha.
- Pie obligatorio en dos partes: **crédito del afiche** al teatro de origen, y **fecha de
  verificación de precios**. Lo primero es la mitigación de derechos de autor; lo segundo
  evita que una imagen reenviada semanas después mienta sobre el precio.

## Pendientes conocidos

| Falta | Nota |
|---|---|
| Layout de escritorio | Solo se diseñó 390px. A 1440px hay que decidir qué pasa. |
| Estado de carga | Los datos vienen por red; ese momento no está diseñado. |
| Estado de error visual | Está especificado que exista, no cómo se ve. |
| Estado "guardado" | Se puede marcar un plan y no hay diseño de cómo se ve marcado. |
| Primera vez | Qué ve alguien que abre la app sin saber qué es. |
| Marca del reloj | La del estado vencido se lee más como una L que como un reloj. |
