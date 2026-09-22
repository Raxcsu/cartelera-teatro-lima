/**
 * flores.js — el cielo de flores amarillas.
 *
 * No pide datos y no lee el reloj, así que la vista sigue en pie aunque la
 * cartelera esté caída o vencida, igual que la escala astronómica. Lo que da
 * esa garantía es no hacer fetch, no la ausencia de imports: pregunta.js
 * importa logica.js Y datos.js y también es autosuficiente.
 *
 * Importa cielo.js, que es la geometría pura de esta pantalla: sin DOM, sin
 * red, sin reloj y sin azar. Vive aparte porque acá adentro no se podía
 * probar, y la galaxia estuvo rota justamente en la capa que nadie veía
 * leyendo. No está en logica.js porque ese módulo es lógica de negocio.
 *
 * Es la única pantalla oscura del proyecto y es a propósito: son flores
 * encendidas, y sin cielo negro no se encienden.
 *
 * También es el primer módulo con un bucle de requestAnimationFrame, y por
 * eso el router aprendió a desmontar por ruta. Un canvas que sigue pintando
 * una vista que ya no está es el mismo defecto que cicloVista y cicloMapa
 * evitan dentro de la cartelera, solo que a nivel de app.js.
 */

import {
  radiosDelCielo, puntoEspiral, puntoCorazon, recortarT, tamanoFlor,
  BRAZOS, DISP, CORAZON_U, CORAZON_ALTO, RESPLANDOR,
} from './cielo.js';

/* ── los mensajes ───────────────────────────────────────────
   Cada flor ocupa un sitio estable y abre un texto propio. El contenido se
   queda junto a la composición porque no viene de red ni es dato de la
   cartelera: es la pieza escrita de esta vista personal. */
const MENSAJES = [
  {
    id: 'lugar-favorito',
    titulo: 'Mi lugar favorito',
    texto: 'Entre todos los planes, siempre termino eligiendo el que me lleva a ti.',
    brazo: 1, t: 0.60, desvio: 0.38, z: 0.48, fase: 0.25, tipo: 2, etiqueta: 'derecha',
  },
  {
    id: 'tu-luz',
    titulo: 'Tu luz',
    texto: 'No necesito inventar otra estrella: tú ya cambias la forma en que miro el cielo.',
    brazo: 0, t: 0.42, desvio: -0.20, z: 0.67, fase: 0.87, tipo: 0, etiqueta: 'arriba',
  },
  {
    id: 'cada-dia',
    titulo: 'Cada día',
    texto: 'Hay una flor por cada día desde que empezamos. Ninguna alcanza a decir todo lo que has ido haciendo en mí.',
    brazo: 0, t: 0.66, desvio: 0.22, z: 0.88, fase: 0.52, tipo: 1, etiqueta: 'izquierda',
  },
  {
    id: 'volveria-a-elegirte',
    titulo: 'Volvería a elegirte',
    texto: 'Puede cambiar el camino, la fecha o la historia. Yo volvería a encontrarte y a elegirte.',
    brazo: 0, t: 0.90, desvio: 0.65, z: 0.52, fase: 0.42, tipo: 2, etiqueta: 'izquierda',
  },
  {
    id: 'que-sea-especial',
    titulo: 'Que sea especial',
    texto: 'No siempre puedo consentirte, pero contigo siempre quiero que cada detalle valga la pena.',
    brazo: 1, t: 0.86, desvio: 0.75, z: 1.04, fase: 0.18, tipo: 0, etiqueta: 'derecha',
  },
  {
    id: 'mi-princesa',
    titulo: 'Mi Princesa',
    texto: 'No hay escala suficiente para medirte. Solo sé que mi vida es más bonita cuando estás en ella.',
    brazo: 1, t: 0.36, desvio: -0.05, z: 0.72, fase: 0.72, tipo: 1, etiqueta: 'abajo',
  },
];

const CARTA_FINAL = {
  titulo: 'Para Valeria',
  parrafos: [
    'Hoy, 21 de setiembre, las flores amarillas me hicieron pensar en ti.',
    'En tu forma de iluminar mis días, en la alegría que siento cuando estamos juntos y en cómo, poco a poco, te has convertido en alguien imprescindible para mí.',
    'Quiero decírtelo sin rodeos y con el corazón abierto: te amo.',
    'No sé cuántas cosas cambiarán con el tiempo, pero sí sé lo que quiero: seguir caminando contigo, cuidarte, hacerte feliz y construir a tu lado muchos recuerdos más.',
    'Estas flores amarillas son para ti, Valeria, Mi princesa, porque desde que llegaste a mi vida, todo se siente más bonito.',
  ],
  firma: '— Oscar',
  /* La cancion NO se sirve desde el repo. "Te mando flores" es un tema
     comercial y esto se publica en GitHub Pages: el mp3 aca seria distribuir
     musica con derechos desde el dominio. El embed de YouTube la reproduce
     entera, con licencia y sin hospedar nada. Se usa el dominio sin cookies,
     y el `list=RD...` del enlace original se descarta a proposito: eso
     encadena una radio automatica despues de la cancion.

     El `autoplay=1` no es un pedido vano. Abrir esta carta exige tocar el
     corazon, y esa activacion habilita el autoplay de la pagina: en Chrome la
     cancion arranca sola al abrirse. En Safari de iPhone no alcanza, porque
     exige el gesto sobre el reproductor mismo, y degrada a tocar play. */
  cancion: 'https://www.youtube-nocookie.com/embed/uAjwRJBzvMg?autoplay=1',
};

/* ── la paleta del cielo ────────────────────────────────────
   Vive ACÁ y no en styles.css porque estos colores los pinta el canvas, no
   el CSS. El fondo de la caja también se escribe desde acá (ver pintarFlores):
   el mismo negro en dos archivos son dos sitios que hay que mover juntos, y
   ese es el problema que ya documenta PIN contra el width de .pin-teatro i.

   Los dorados son el contenido: la vista se llama flores amarillas. El
   violeta y el azul del original se fueron; el frío de la galaxia es ahora
   el rosa de la familia del acento, el mismo de las flores de la invitación.
   El verde de las hojas es PROPIO y NO --ok: ese es el verde del semáforo de
   confianza y DESIGN.md prohíbe reusarlo para decorar. */
const CIELO = {
  fondo: '#030208',
  centro: '#130c28',
  medio: '#090617',
  borde: '#020106',
  estrella: '#fff9ee',
  oro: '#ffd75d',
  oroClaro: '#fff08a',
  oroMedio: '#ffd638',
  oroHondo: '#e49d0a',
  rosa: '#c77e90',
  corazon: '#d98fa0',
  tallo: '#55741c',
  hoja: '#6e9527',
  semilla: '#e4a528',
};

const MAX_CHISPAS = 240;
const DURACION_ENTRADA = 1400;

// Estado de módulo. Todo lo que se enciende acá se apaga en desmontar().
let raiz = null, caja = null, lienzo = null, ctx = null, controles = null;
let leyenda = null, dialogo = null, dialogoTitulo = null, dialogoCuerpo = null;
let dialogoFirma = null, dialogoCancion = null, activadorCarta = null, fallback = null;
let ancho = 0, alto = 0, cx = 0, cy = 0, escala = 1;
// Los radios los deriva sembrar() con radiosDelCielo(), NO medir(): así el
// sembrado no puede correr sobre radios viejos y el orden deja de ser un
// contrato que hay que recordar. Con r0 = 0 todo el polvo colapsa en un
// punto, sin lanzar nada.
let radios = { radioUtil: 0, r0: 0, rMax: 0, escalaCorazon: 1 };
let estrellas = [], polvo = [], corazon = [], flores = [], chispas = [];
// Los botones DOM de las flores, en el MISMO orden que MENSAJES y que
// flores[]. Existen porque las posiciones pasaron de porcentajes a
// pixeles: los porcentajes eran independientes de la resolucion y estos
// no, asi que hay que reescribirlos en cada medida.
let botones = [];
let cuadro = null, cuadroMedida = null, inicioEntrada = 0;
let alRedimensionar = null, alCambiarVisibilidad = null, alCambiarMovimiento = null;
let alCerrarDialogo = null, consultaMovimiento = null;

const quieto = () => consultaMovimiento?.matches
  ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Acá sí va Math.random(), y no contradice al ramo de la invitación: el ramo
   tiene que ser idéntico en cada visita porque su número es un dato. Una
   estrella no es dato de nadie, y el cielo se vuelve a sembrar en cada medida
   de todos modos. Lo único fijo es dónde van las flores. */
const azar = (tope = 1, piso = 0) => Math.random() * (tope - piso) + piso;

// ── medida y siembra ──────────────────────────────────────

/**
 * El cielo ocupa lo que queda bajo la cabecera, y eso se mide, no se declara.
 *
 * La página original era position:fixed sobre todo el viewport. Acá la
 * cabecera se queda arriba, y el alto exacto que sobra no se puede escribir
 * en CSS sin un :has() que sostenga el layout — justo lo que la regla del
 * proyecto no permite, porque sin soporte quedaría media pantalla vacía.
 * Medirlo desde JS funciona en los dos layouts y no estrena nada.
 */
function medir() {
  if (!raiz || !caja) return;
  const respiro = parseFloat(getComputedStyle(raiz).paddingBottom) || 0;
  const arriba = caja.getBoundingClientRect().top;
  const visual = window.visualViewport;
  const limite = visual ? visual.height + visual.offsetTop : window.innerHeight;
  caja.style.height = Math.max(300, Math.round(limite - arriba - respiro)) + 'px';

  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = caja.clientWidth;
  alto = caja.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = ancho * 0.5;
  cy = alto * 0.53;
  escala = Math.min(ancho, alto) / 720;
  sembrar();

  // El tamaño del blanco táctil del corazón NO se escribe en el CSS: depende
  // de la escala, y duplicarlo sería estrenar una segunda versión del
  // problema de PIN contra .pin-teatro i. Se mide por el ANCHO de la curva
  // (16 unidades) y no por su alto: es el eje mayor, y un círculo ajustado
  // al alto dejaría los dos lóbulos fuera del blanco. El piso de 44px es la
  // regla de área táctil de DESIGN.md.
  caja.style.setProperty('--tap-corazon',
    Math.max(44, Math.round(radios.r0 * 2 / RESPLANDOR)) + 'px');
  // La media altura real del corazón dibujado. La etiqueta de escritorio
  // cuelga de acá en vez de un top fijo: con 90px se le metía adentro.
  caja.style.setProperty('--corazon-alto',
    Math.round(CORAZON_ALTO * CORAZON_U * radios.escalaCorazon) + 'px');

  // Ultimo: necesita flores[], que acaba de producir sembrar().
  reposicionarControles();
}

/** Agrupa todos los resize de un cuadro en una sola resiembra. */
function programarMedida() {
  if (cuadroMedida !== null) return;
  cuadroMedida = requestAnimationFrame(() => {
    cuadroMedida = null;
    medir();
    if (ctx && (quieto() || cuadro === null)) dibujar(performance.now());
  });
}

function sembrar() {
  // PRIMER acto, siempre. Ver el comentario de `radios` arriba.
  radios = radiosDelCielo(ancho, alto, escala);

  const densidad = Math.min(1, (ancho * alto) / (1280 * 720));

  estrellas = Array.from({ length: Math.floor(150 + 260 * densidad) }, () => ({
    x: azar(ancho), y: azar(alto), r: azar(1.65, 0.2),
    a: azar(0.9, 0.15), tw: azar(5, 0.7), p: azar(Math.PI * 2),
  }));

  // Cada grano precalcula su radio y su ángulo base UNA vez. El bucle de
  // dibujo solo le suma el giro global y hace cos/sin: cero asignaciones y
  // cero Math.pow por cuadro. Llamar a puntoEspiral() por grano por cuadro
  // serían ~65.000 objetos por segundo con 1080 granos a 60fps — basura
  // efímera dentro del rAF, que en un celular de gama baja se ve como
  // tirones y cuya causa no se parece al síntoma.
  polvo = [];
  const granos = Math.floor(700 + 680 * densidad);
  for (let i = 0; i < granos; i++) {
    const brazo = i % BRAZOS;
    // capa tiene que ser INDEPENDIENTE de brazo. Con BRAZOS = 2, escribir
    // i % 2 pondría cada brazo entero en un solo plano de profundidad:
    // una regresión visual que no se ve leyendo el código.
    const capa = Math.floor(i / BRAZOS) % 2;
    // Acoplado al exponente 0.9 de puntoEspiral(): componen a ≈sqrt(azar()),
    // el muestreo de área uniforme sobre un disco. Mover uno solo desbalancea
    // la densidad sin que nada avise.
    const t = Math.pow(azar(), 0.55);
    const disp = azar(DISP, -DISP) * (1 - t * 0.55);
    const { a, r } = puntoEspiral(brazo, t, radios, { disp });
    polvo.push({
      a0: a, r, t, apl: radios.aplanado.capa[capa], capa,
      s: azar(2.3, 0.35), o: azar(0.88, 0.12),
      z: azar(1.3, 0.35),
      // El color se liga al radio: casi todo oro junto al corazón, rosa
      // ganando hacia la punta de los brazos. Antes era azar puro, sin
      // relación con dónde estaba el grano.
      //
      // Los coeficientes están calibrados contra el sesgo de t, no elegidos
      // a ojo: con t = pow(azar(), 0.55) la media de t es 1/1.55 ≈ 0.645, así
      // que un umbral (0.15 + t·0.85) dejaba solo ~30% de oro y la pantalla
      // salía violeta. En una vista que se llama flores amarillas, el oro
      // tiene que ganar.
      calido: Math.random() > (0.06 + t * 0.62),
      fase: azar(Math.PI * 2),
    });
  }

  // La curva del corazón, con las partículas repartidas al azar sobre ella.
  //
  // La paramétrica sale de cielo.js y viene YA recentrada: antes el corazón
  // colgaba ~102px bajo el centro y solo ~30px encima. Y todo va contra
  // escalaCorazon, incluido el jitter: dejarlo en `escala` desacopla la
  // difuminación del borde del tamaño dibujado, y las dos escalas llegan a
  // diferir un 16% en la caja angosta.
  const ec = radios.escalaCorazon;
  corazon = [];
  for (let i = 0; i < 260; i++) {
    const { x, y } = puntoCorazon(azar(Math.PI * 2));
    corazon.push({
      x: x * ec * CORAZON_U + azar(2.2, -2.2) * ec,
      y: y * ec * CORAZON_U + azar(2.2, -2.2) * ec,
      a: azar(0.98, 0.28), r: azar(2.3, 0.55), p: azar(Math.PI * 2),
    });
  }

  // Las posiciones y las semillas son estables. Antes el centro de cada flor
  // generaba 21 puntos al azar EN CADA CUADRO: 126 llamadas a Math.random()
  // por frame y una vibración visual que no pertenecía al movimiento.
  // Cada flor vive sobre un brazo, no en un x/y suelto. `t` se recorta
  // hacia adentro hasta que la flor ENTERA entre en la caja: antes dos de
  // las seis salian cortadas por el borde. Y el tamano se mide contra el
  // disco, no contra `escala`: las dos medidas divergen 1,7x entre
  // escritorio y movil, y con `escala` las flores pesaban 1,7x mas dentro
  // del cuadro en movil. Eso era el defecto #8 por la puerta de atras.
  // La banda de .flores-copia ocupa el fondo de la caja con la pista y su
  // degradado. Para el recorte la caja TERMINA ahi: una flor "dentro de la
  // caja" pero debajo de la pista se lee como cortada igual, y su etiqueta
  // choca con el texto. Se vio en pantalla con la flor de mas abajo.
  const RESERVA_PISTA = 40;
  const cajaFlor = { ancho, alto: alto - RESERVA_PISTA, cx, cy };
  flores = MENSAJES.map((mensaje, i) => {
    const desvio = mensaje.desvio ?? 0;
    const t = recortarT(mensaje.brazo, mensaje.t, radios, cajaFlor, desvio);
    const p = puntoEspiral(mensaje.brazo, t, radios,
      { cx, cy, disp: desvio });
    return {
    ...mensaje,
    px: p.x, py: p.y, tam: tamanoFlor(t, radios),
    giro: azar(0.3, -0.3),
    semillas: Array.from({ length: 21 }, (_, k) => {
      const radio = Math.sqrt((k + 0.5) / 21) * 0.29;
      const angulo = k * 2.3999632297 + i * 0.31;
      return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio };
    }),
    };
  });
}

// ── dibujo ────────────────────────────────────────────────

/* punto() deja globalAlpha donde lo dejó la última partícula, y save/restore
   lo conserva. Por eso todo lo que se dibuja con un fill propio —el núcleo de
   la galaxia, los pétalos, el centro de la flor— empieza reponiendo el alfa:
   sin eso los girasoles heredaban el 0,1 del halo de la última estrella y
   salían fantasmales. Se veía en pantalla: flores amarillas sin amarillo. */
function punto(x, y, r, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function progresoEntrada(transcurrido, demora = 0, duracion = 600) {
  if (quieto()) return 1;
  const p = Math.max(0, Math.min(1, (transcurrido - demora) / duracion));
  return p * p * (3 - 2 * p);
}

function galaxia(t, entrada) {
  // El halo del disco. Reemplaza a DOS cosas que se fueron: el gradiente
  // circular del núcleo, cuyo trabajo hace ahora el resplandor con forma de
  // corazón, y los diez ctx.ellipse() concéntricos que se leían como un logo
  // de átomo — eran trazos geométricos duros y eran lo primero que veía el
  // ojo. Acá no hay trazo: es un gradiente aplastado, sin coste por vuelta.
  //
  // Va FUERA del bloque 'lighter' y con su propio save/restore. Dos cosas
  // que hay que mantener: el alfa se declara acá porque punto() lo deja
  // sucio (ver el comentario de punto()), y el save/restore tiene que
  // cerrar, o cada cuadro empuja un estado más a la pila del contexto.
  ctx.save();
  ctx.globalAlpha = entrada;
  ctx.translate(cx, cy);
  ctx.scale(1, radios.aplanado.base);
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radios.radioUtil);
  halo.addColorStop(0, 'rgba(255,214,120,.16)');
  halo.addColorStop(0.42, 'rgba(199,126,144,.09)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radios.radioUtil, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Giro RÍGIDO: las dos capas van en el mismo sentido y a velocidad casi
  // igual. Antes la capa de atrás giraba al revés (-0.58) y las dos se
  // cancelaban, y encima cada grano tenía su propia velocidad con 5,5× de
  // dispersión: la rotación diferencial es correcta en física y destructiva
  // en pantalla, porque enrolla los brazos hasta borrarlos. La profundidad
  // sale de z, del alfa, del radio y del aplanado por capa, no de la velocidad.
  const giro = t * 0.055;
  const giroFondo = t * 0.050;
  for (const p of polvo) {
    const a = p.a0 + (p.capa ? giroFondo : giro);
    // El latido del corazón viajando hacia afuera.
    const pulso = 0.85 + 0.35 * Math.sin(t * 2.2 - p.t * 2.4 + p.fase * 0.35);
    punto(cx + Math.cos(a) * p.r, cy + Math.sin(a) * p.r * p.apl,
      p.s * p.z, p.calido ? CIELO.oro : CIELO.rosa, p.o * pulso * entrada);
  }
  ctx.restore();
}

/**
 * El núcleo de la galaxia, recortado a la forma del corazón.
 *
 * Es lo que reemplaza al gradiente circular que vivía en galaxia(): ahora la
 * galaxia no tiene un núcleo propio compitiendo con el corazón, tiene ESTE.
 * De ahí salen los brazos, y por eso el polvo arranca justo en su borde.
 *
 * Se dibuja antes que el polvo y después que las estrellas, y por eso el
 * `globalAlpha` se declara: punto() lo deja sucio y las estrellas son lo
 * último que lo tocó. Sin este reset el núcleo hereda el alfa de la última
 * estrella —distinto cada cuadro— y parpadea sin motivo. Es el mismo defecto
 * que una vez dejó a las flores amarillas sin amarillo.
 */
function nucleoCorazon(t, entrada) {
  const u = radios.escalaCorazon * CORAZON_U * RESPLANDOR;
  const respira = 1 + Math.sin(t * 2.2) * 0.035;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = entrada;
  // El gradiente se apaga MUY rápido: llenando la silueta entera a alfa alto,
  // el resplandor deja de leerse como luz y pasa a ser un borrón beige que
  // le come el contorno a las partículas. Lo que tiene que brillar es el
  // centro, no la forma.
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, radios.r0));
  g.addColorStop(0, 'rgba(255,228,150,.34)');
  g.addColorStop(0.18, 'rgba(255,186,54,.17)');
  g.addColorStop(0.45, 'rgba(217,143,160,.06)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const { x, y } = puntoCorazon((i / 120) * Math.PI * 2);
    const px = cx + x * u * respira;
    const py = cy + y * u * respira;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function latido(t, entrada) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = entrada;
  const respira = 1 + Math.sin(t * 2.2) * 0.075;
  for (const p of corazon) {
    const a = p.a * (0.62 + Math.sin(t * 2 + p.p) * 0.38);
    const x = cx + p.x * respira;
    const y = cy + p.y * respira;
    punto(x, y, p.r, CIELO.corazon, a * entrada);
    if (p.r > 1.7) punto(x, y, p.r * 3.8, CIELO.rosa, a * entrada * 0.1);
  }
  ctx.restore();
}

function girasol(x, y, tam, vuelta, t, tipo, semillas, entrada) {
  ctx.save();
  // El alfa de la flor se DECLARA acá, y no se hereda del último punto que
  // se haya dibujado. Opaca queda de calcomanía sobre el cielo; a 0,62 es
  // una flor encendida dentro de la galaxia, que es lo que la vista es.
  ctx.globalAlpha = 0.62 * entrada;
  ctx.translate(x, y);
  ctx.rotate(vuelta + Math.sin(t * 0.55 + tipo) * 0.08);
  ctx.scale(0.88 + entrada * 0.12, 0.88 + entrada * 0.12);

  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, tam * 1.45);
  halo.addColorStop(0, 'rgba(255,193,28,.26)');
  halo.addColorStop(1, 'rgba(255,193,28,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, tam * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CIELO.tallo;
  ctx.lineWidth = Math.max(1, tam * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, tam * 0.45);
  ctx.quadraticCurveTo(-tam * 0.1, tam * 1.35, tam * 0.12, tam * 2.1);
  ctx.stroke();

  ctx.fillStyle = CIELO.hoja;
  ctx.beginPath();
  ctx.ellipse(-tam * 0.2, tam * 1.2, tam * 0.16, tam * 0.42, -0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(tam * 0.22, tam * 1.52, tam * 0.14, tam * 0.35, 0.85, 0, Math.PI * 2);
  ctx.fill();

  const petalos = tipo === 2 ? 15 : 12;
  for (let i = 0; i < petalos; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI * 2 / petalos);
    const g = ctx.createLinearGradient(0, 0, 0, -tam);
    g.addColorStop(0, CIELO.oroHondo);
    g.addColorStop(0.45, CIELO.oroMedio);
    g.addColorStop(1, CIELO.oroClaro);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -tam * 0.58, tam * 0.24, tam * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const centro = ctx.createRadialGradient(-tam * 0.1, -tam * 0.1, tam * 0.03, 0, 0, tam * 0.48);
  centro.addColorStop(0, '#8a4b0b');
  centro.addColorStop(0.55, '#5a2607');
  centro.addColorStop(1, '#281105');
  ctx.fillStyle = centro;
  ctx.beginPath();
  ctx.arc(0, 0, tam * 0.46, 0, Math.PI * 2);
  ctx.fill();

  for (const semilla of semillas) {
    punto(semilla.x * tam, semilla.y * tam, tam * 0.026, CIELO.semilla, 0.75 * entrada);
  }
  ctx.restore();
}

function ramillete(t, transcurrido) {
  flores.forEach((f, i) => {
    const entrada = progresoEntrada(transcurrido, 480 + i * 85, 420);
    const flotaY = Math.sin(t * 0.65 + f.fase * 9) * 10 * escala;
    const flotaX = Math.cos(t * 0.44 + f.fase * 7) * 5 * escala;
    girasol(f.px + flotaX, f.py + flotaY,
      f.tam, f.giro, t, f.tipo, f.semillas, entrada);
  });
}

function destellos() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = chispas.length - 1; i >= 0; i--) {
    const c = chispas[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.012;
    c.vida -= 0.018;
    punto(c.x, c.y, c.r, CIELO.oro, Math.max(0, c.vida));
    if (c.vida <= 0) chispas.splice(i, 1);
  }
  ctx.restore();
}

function dibujar(ahora) {
  if (!ctx) return;
  const t = ahora / 1000;
  const transcurrido = quieto() ? DURACION_ENTRADA : Math.max(0, ahora - inicioEntrada);
  ctx.clearRect(0, 0, ancho, alto);
  const fondo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(ancho, alto) * 0.76);
  fondo.addColorStop(0, CIELO.centro);
  fondo.addColorStop(0.42, CIELO.medio);
  fondo.addColorStop(1, CIELO.borde);
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho, alto);

  for (const s of estrellas) {
    const a = s.a * (0.63 + Math.sin(t * s.tw + s.p) * 0.37);
    punto(s.x, s.y, s.r, CIELO.estrella, a);
    if (s.r > 1.1) punto(s.x, s.y, s.r * 3, CIELO.rosa, a * 0.1);
  }

  // El orden manda: el núcleo va DEBAJO de los brazos y el corazón ENCIMA.
  // Así los brazos nacen de él y el polvo no le rompe la silueta.
  nucleoCorazon(t, progresoEntrada(transcurrido, 200, 700));
  galaxia(t, progresoEntrada(transcurrido, 0, 800));
  latido(t, progresoEntrada(transcurrido, 300, 650));
  ramillete(t, transcurrido);
  destellos();
  ctx.globalAlpha = 1;
}

function bucle(ahora) {
  dibujar(ahora);
  cuadro = requestAnimationFrame(bucle);
}

function arrancarBucle() {
  if (ctx && cuadro === null) cuadro = requestAnimationFrame(bucle);
}

function pararBucle() {
  if (cuadro !== null) cancelAnimationFrame(cuadro);
  cuadro = null;
}

// ── interacción ───────────────────────────────────────────

function estallar(x, y) {
  if (quieto()) return;
  const nuevas = 50;
  if (chispas.length + nuevas > MAX_CHISPAS) {
    chispas.splice(0, chispas.length + nuevas - MAX_CHISPAS);
  }
  for (let i = 0; i < nuevas; i++) {
    const a = azar(Math.PI * 2);
    const v = azar(3.1, 0.45);
    chispas.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      r: azar(2.6, 0.6), vida: azar(1, 0.5),
    });
  }
}

function abrirCarta(contenido, activador) {
  if (!dialogo) return;
  activadorCarta = activador;
  dialogoTitulo.textContent = contenido.titulo;
  dialogoCuerpo.replaceChildren();

  const parrafos = contenido.parrafos ?? [contenido.texto];
  for (const texto of parrafos) {
    const p = document.createElement('p');
    p.textContent = texto;
    dialogoCuerpo.append(p);
  }

  dialogoFirma.textContent = contenido.firma ?? '';
  dialogoFirma.hidden = !contenido.firma;

  // Igual que `firma`: campo opcional del contenido. Solo la carta final lo
  // trae; los seis mensajes de las flores comparten este mismo dialogo y no
  // llevan musica. El src se pone aca y no en la plantilla para no pedirle
  // nada a YouTube mientras ella lee los otros seis.
  const iframe = dialogoCancion.querySelector('iframe');
  dialogoCancion.hidden = !contenido.cancion;
  if (contenido.cancion) {
    if (iframe.src !== contenido.cancion) iframe.src = contenido.cancion;
  } else if (iframe.src) {
    iframe.removeAttribute('src');
  }
  if (!dialogo.open) dialogo.showModal();
}

function fijarLeyenda(texto = 'Elige una flor') {
  if (leyenda) leyenda.textContent = texto;
}

/**
 * Reescribe la posicion de los botones desde flores[].
 *
 * Antes esto era un clamp en porcentajes escrito UNA vez en crearControles(),
 * y era seguro porque los porcentajes no dependen de la resolucion. Ahora las
 * posiciones son pixeles calculados sobre la espiral, asi que medir() tiene
 * que volver a escribirlos: sin esto, girar el telefono despega los botones
 * de sus flores y el dibujo se ve perfecto mientras el blanco tactil apunta
 * a otro lado. Modo de falla silencioso, de los peores.
 *
 * El clamp se conserva: las flores pueden asomarse por el borde, su blanco no.
 */
function reposicionarControles() {
  botones.forEach((boton, i) => {
    const f = flores[i];
    if (!f) return;
    boton.style.left = Math.round(Math.min(Math.max(f.px, 22), ancho - 22)) + 'px';
    boton.style.top = Math.round(Math.min(Math.max(f.py, 22), alto - 22)) + 'px';
  });
}

function crearControles() {
  const fragmento = document.createDocumentFragment();

  // Sin posicionar: lo hace reposicionarControles() desde medir(). Por eso
  // crearControles() corre ANTES de la primera medida, para que los botones
  // existan cuando esa medida los coloque.
  botones = [];
  MENSAJES.forEach((mensaje, indice) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'flor-mensaje';
    boton.dataset.etiqueta = mensaje.etiqueta;
    boton.setAttribute('aria-label', 'Abrir mensaje: ' + mensaje.titulo);

    const titulo = document.createElement('span');
    titulo.className = 'flor-etiqueta';
    titulo.textContent = mensaje.titulo;
    boton.append(titulo);

    const mostrarTitulo = () => fijarLeyenda(mensaje.titulo);
    const ocultarTitulo = () => fijarLeyenda();
    boton.addEventListener('focus', mostrarTitulo);
    boton.addEventListener('blur', ocultarTitulo);
    boton.addEventListener('pointerenter', mostrarTitulo);
    boton.addEventListener('pointerleave', ocultarTitulo);
    boton.addEventListener('click', (evento) => {
      evento.stopPropagation();
      // La posicion sale de flores[], NO de mensaje.x/mensaje.y: esos campos
      // ya no existen, y leerlos daria `undefined * ancho = NaN`, con las
      // chispas cayendo en ninguna parte y sin un solo error en consola.
      const f = flores[indice];
      if (f) estallar(f.px, f.py);
      abrirCarta(mensaje, boton);
    });
    botones.push(boton);
    fragmento.append(boton);
  });

  const corazonBoton = document.createElement('button');
  corazonBoton.type = 'button';
  corazonBoton.className = 'corazon-mensaje';
  corazonBoton.setAttribute('aria-label', 'Abrir la carta para Valeria');
  corazonBoton.innerHTML = '<span class="corazon-etiqueta">Para Valeria</span>';
  corazonBoton.addEventListener('focus', () => fijarLeyenda('Para Valeria'));
  corazonBoton.addEventListener('blur', () => fijarLeyenda());
  corazonBoton.addEventListener('pointerenter', () => fijarLeyenda('Para Valeria'));
  corazonBoton.addEventListener('pointerleave', () => fijarLeyenda());
  corazonBoton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    estallar(cx, cy);
    abrirCarta(CARTA_FINAL, corazonBoton);
  });
  fragmento.append(corazonBoton);
  controles.append(fragmento);
}

function activarFallback() {
  caja.classList.add('sin-canvas');
  lienzo.hidden = true;
  controles.hidden = true;
  leyenda.hidden = true;
  fallback.hidden = false;
  const lista = fallback.querySelector('.flores-fallback-lista');

  for (const mensaje of [...MENSAJES, CARTA_FINAL]) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'flores-fallback-boton';
    boton.textContent = mensaje.titulo;
    boton.addEventListener('click', () => abrirCarta(mensaje, boton));
    lista.append(boton);
  }
}

// ── vista ─────────────────────────────────────────────────

export function pintarFlores(app) {
  raiz = app;
  app.className = 'app flores';
  app.innerHTML = `
    <article class="flores-articulo" aria-labelledby="flores-titulo">
      <header class="flores-cabecera">
        <p class="flores-kicker">Un pequeño universo</p>
        <h2 id="flores-titulo" tabindex="-1">Flores amarillas</h2>
      </header>

      <div class="flores-caja">
        <canvas class="flores-cielo" role="img"
          aria-label="Un cielo nocturno con girasoles y un corazón de estrellas"></canvas>
        <div class="flores-controles" aria-label="Mensajes entre las flores"></div>
        <p class="flores-leyenda" aria-hidden="true">Elige una flor</p>
        <div class="flores-copia">
          <p class="flores-pista"><span class="flores-pista-elige">Elige una flor · </span>toca el corazón para abrir la carta</p>
        </div>
        <section class="flores-fallback" aria-labelledby="flores-fallback-titulo" hidden>
          <h3 id="flores-fallback-titulo">Un pequeño universo para ti</h3>
          <p>El cielo no pudo dibujarse, pero sus mensajes siguen aquí.</p>
          <div class="flores-fallback-lista"></div>
        </section>
      </div>
    </article>

    <dialog class="carta-dialogo" aria-labelledby="carta-titulo">
      <article class="carta-papel">
        <p class="carta-kicker">Una flor para ti</p>
        <h3 id="carta-titulo"></h3>
        <div class="carta-cuerpo"></div>
        <p class="carta-firma" hidden></p>
        <div class="carta-cancion" hidden>
          <iframe title="Te mando flores — Fonseca" loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <form method="dialog">
          <button type="submit" class="btn carta-cerrar">Cerrar</button>
        </form>
      </article>
    </dialog>`;

  caja = app.querySelector('.flores-caja');
  lienzo = app.querySelector('.flores-cielo');
  controles = app.querySelector('.flores-controles');
  leyenda = app.querySelector('.flores-leyenda');
  fallback = app.querySelector('.flores-fallback');
  dialogo = app.querySelector('.carta-dialogo');
  dialogoTitulo = app.querySelector('#carta-titulo');
  dialogoCuerpo = app.querySelector('.carta-cuerpo');
  dialogoFirma = app.querySelector('.carta-firma');
  dialogoCancion = app.querySelector('.carta-cancion');
  consultaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  try {
    ctx = lienzo.getContext('2d');
  } catch {
    ctx = null;
  }
  // El negro del fondo sale de la misma constante que pinta el canvas. Si
  // además viviera en styles.css habría que moverlos juntos para siempre.
  caja.style.background = CIELO.fondo;

  alCerrarDialogo = () => {
    const activador = activadorCarta;
    activadorCarta = null;
    if (activador?.isConnected) activador.focus();
  };
  dialogo.addEventListener('close', alCerrarDialogo);

  if (!ctx) {
    activarFallback();
  } else {
    // crearControles() ANTES de medir(): los botones ya no traen su
    // posicion puesta, se la escribe la medida.
    crearControles();
    medir();
    inicioEntrada = performance.now();
    if (quieto()) dibujar(inicioEntrada);
    else arrancarBucle();
  }

  alRedimensionar = programarMedida;
  window.addEventListener('resize', alRedimensionar, { passive: true });
  window.visualViewport?.addEventListener('resize', alRedimensionar, { passive: true });

  // Un bucle de rAF en una pestaña de fondo no se ve y sí se paga.
  alCambiarVisibilidad = () => {
    if (document.hidden) pararBucle();
    else if (!quieto()) arrancarBucle();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  alCambiarMovimiento = () => {
    pararBucle();
    chispas = [];
    if (!ctx) return;
    if (quieto()) dibujar(performance.now());
    else if (!document.hidden) {
      inicioEntrada = performance.now() - DURACION_ENTRADA;
      arrancarBucle();
    }
  };
  consultaMovimiento.addEventListener('change', alCambiarMovimiento);

  // El cielo conserva sus destellos, pero los mensajes siempre tienen un
  // control DOM de 44px: el dibujo nunca es el único camino para llegarles.
  caja.addEventListener('pointerdown', (e) => {
    if (!ctx || e.target.closest('button, a')) return;
    const r = lienzo.getBoundingClientRect();
    estallar(e.clientX - r.left, e.clientY - r.top);
  });
}

/** Apaga todo lo que esta vista dejó corriendo fuera de #app. */
export function desmontar() {
  pararBucle();
  if (cuadroMedida !== null) cancelAnimationFrame(cuadroMedida);
  cuadroMedida = null;
  activadorCarta = null;
  if (dialogo?.open) dialogo.close();
  if (alRedimensionar) window.removeEventListener('resize', alRedimensionar);
  if (alRedimensionar) window.visualViewport?.removeEventListener('resize', alRedimensionar);
  if (alCambiarVisibilidad) document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  if (alCambiarMovimiento) consultaMovimiento?.removeEventListener('change', alCambiarMovimiento);
  if (alCerrarDialogo) dialogo?.removeEventListener('close', alCerrarDialogo);
  alRedimensionar = alCambiarVisibilidad = alCambiarMovimiento = alCerrarDialogo = null;
  // Sin esto los ~1500 objetos del cielo siguen vivos colgados del módulo
  // aunque el DOM que los mostraba ya no exista.
  estrellas = polvo = corazon = flores = chispas = [];
  radios = { radioUtil: 0, r0: 0, rMax: 0, escalaCorazon: 1 };
  botones = [];
  raiz = caja = lienzo = ctx = controles = leyenda = fallback = null;
  dialogo = dialogoTitulo = dialogoCuerpo = dialogoFirma = activadorCarta = null;
  dialogoCancion = null;
  consultaMovimiento = null;
}
