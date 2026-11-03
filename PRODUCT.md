# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos personas, por igual: Oscar y su pareja. Usan la cartelera juntos para elegir a qué obra
ir en Lima. Las vistas personales ("Para ti") las arma Oscar como regalo y ella las abre en el
celular, casi siempre desde un link que él le manda por correo o mensaje.

## Product Purpose

"Theater with her" responde dos cosas: qué obra hay en Lima y si vale la pena (la cartelera:
mapa, calendario y fichas con sinopsis, género y elenco), y qué salidas compartieron o van a
compartir (las vistas personales: invitaciones, recuerdos y detalles). El éxito de una vista
personal es que ella la abra y la sienta hecha para ella; el de la cartelera, decidir rápido y
con datos ciertos.

## Positioning

No es una cartelera pública ni un agregador: es una cartelera de dos, con datos verificados a
mano y con las citas de la pareja viviendo al lado de las funciones.

## Operating Context

- Se abre sobre todo en el teléfono, a veces en el escritorio.
- Se publica en GitHub Pages, sin paso de build; cada vista es una ruta por hash.
- La cartelera se refresca a mano desde Teleticket, Joinnus, salas y agregadores.

## Capabilities and Constraints

- Sin build ni dependencias en el navegador salvo Leaflet (mapa) y un embed de YouTube.
- Las vistas personales no dependen de que cargue la cartelera.
- Las reglas del dato: nunca inventar (lo que no está verificado va vacío), la fuente viaja
  con el dato, la confianza se calcula.
- Las entradas reales (QR, DNI, número de compra) nunca entran al repo, que es público.
- Español en código, datos y pantalla.

## Brand Commitments

- Nombre: "Theater with her".
- El rosa vino de la app sigue siendo de la app, también en las vistas personales.
- Cero emoji: los íconos se dibujan.
- Nada cursi ni recargado; tampoco lúgubre.

## Evidence on Hand

- Fotos oficiales de los eventos con su crédito (`assets/noche-criolla/`, `assets/romeo-julieta/`).
- Fotos propias del primer mes (`assets/primer-mes/`).
- Datos de cartelera con fuente y fecha en `data/`.
- No hay fotos de la pareja en las invitaciones ni textos de ella; no se fabrican.

## Product Principles

1. Lo que no está verificado no se muestra como cierto.
2. Cada vista personal es un objeto propio, no una plantilla con otro color.
3. En el celular, lo útil (hora, lugar, cómo llegar) tiene que estar a mano.
4. Un fallo de red nunca se lee como "no hay nada".

## Accessibility & Inclusion

Área táctil mínima de 44px, contraste AA, todo con `prefers-reduced-motion` (con el movimiento
apagado se ve el estado final entero), teclado y lector de pantalla.
