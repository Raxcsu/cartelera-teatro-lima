/**
 * cielo.js — la geometría pura del cielo de flores amarillas.
 *
 * Reglas de este archivo, las mismas que logica.js:
 *   1. Cero imports. Cero DOM. Cero red. Cero Math.random(). Cero reloj.
 *   2. Entran números y salen números. Nada de acá dibuja.
 *   3. Si algo puede estar mal en un cálculo, vive acá y tiene test.
 *
 * Por qué NO está en logica.js: ese módulo guarda la lógica de NEGOCIO
 * —fechas, confianza, distancias, IDs— y meterle trigonometría de canvas
 * lo convertiría en el cajón de todo lo puro. Un módulo propio da lo mismo
 * (pureza, pruebas, un solo sitio donde mirar) sin redefinir qué es logica.js.
 *
 * Por qué existe: la galaxia vieja no tenía brazos y nadie lo vio en el
 * código. Tres revisiones sobre prosa dejaron pasar el mismo error de
 * geometría. Las reglas de acá abajo no se ven leyendo; se ven probándolas.
 */

// ─────────────────────────────────────────────────────────────
//  La curva del corazón
//  Se escribe UNA vez. Antes vivía inline en la siembra de las
//  partículas, y sus extensiones (16, 11, 6) estaban calculadas
//  a mano en otro sitio: tres copias de la misma curva, y una de
//  ellas gobierna el radio interior del disco entero.
// ─────────────────────────────────────────────────────────────

/** Unidades de la paramétrica → px, antes de escalar. */
export const CORAZON_U = 6;

/** Cuánto se pasa el resplandor del borde de la curva. */
export const RESPLANDOR = 1.6;

/**
 * La paramétrica cruda, sin recentrar. Es el ÚNICO sitio del proyecto
 * donde se escriben estos coeficientes.
 */
function curvaCorazon(theta) {
  return {
    x: 16 * Math.pow(Math.sin(theta), 3),
    y: -(13 * Math.cos(theta) - 5 * Math.cos(2 * theta)
         - 2 * Math.cos(3 * theta) - Math.cos(4 * theta)),
  };
}

/**
 * Las extensiones salen de muestrear la curva, no de literales.
 *
 * Y no es teoría. A mano se asumía que los extremos en y caen en θ=0 y
 * θ=π —o sea y ∈ [-5, 17]— y de ahí salían alto=11 y centro=6. Es falso:
 * el mínimo está en θ≈0.289π y vale -11,92. El error en el centro eran
 * 3,46 unidades, ~21px de corazón corrido a escala 1. Lo encontró la
 * primera corrida de cielo.test.js, no tres rondas de revisión del texto.
 *
 * La curva cruda y la recentrada son dos funciones por un motivo concreto:
 * recentrar necesita el centro, y el centro sale de muestrear. Con una
 * sola función habría ciclo.
 */
export function extensionesCorazon(muestras = 360) {
  let xMax = 0, yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < muestras; i++) {
    const { x, y } = curvaCorazon((i / muestras) * Math.PI * 2);
    xMax = Math.max(xMax, Math.abs(x));
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  return {
    ancho: xMax,                 // = 16
    alto: (yMax - yMin) / 2,     // ≈ 14.46
    centro: (yMax + yMin) / 2,   // ≈ 2.54
  };
}

const EXT = extensionesCorazon();

export const CORAZON_ANCHO = EXT.ancho;
export const CORAZON_ALTO = EXT.alto;
export const CORAZON_CENTRO = EXT.centro;

/**
 * La curva YA recentrada en y. Sin esto el corazón cuelga: la paramétrica
 * da y ∈ [-5, 17], o sea 30px arriba del centro y 102px abajo.
 */
export function puntoCorazon(theta) {
  const { x, y } = curvaCorazon(theta);
  return { x, y: y - CORAZON_CENTRO };
}

// ─────────────────────────────────────────────────────────────
//  La espiral
// ─────────────────────────────────────────────────────────────

export const BRAZOS = 2;

/** Radianes que recorre cada brazo. Antes eran 7.5 (430°, más de una vuelta). */
export const VUELTA = 2.6;

/**
 * Dispersión angular de los granos.
 *
 * El margen NO es π/2. Los brazos no son puntos: cada uno barre VUELTA,
 * así que el hueco entre la punta de uno y el arranque del otro es
 * (π − VUELTA) = 0,54 rad, y el margen por lado es la mitad: 0,271.
 * El punto donde aprieta es la punta del brazo, no el ancla.
 *
 * 0,25 queda por debajo de ese margen SIN contar el atenuador de B1,
 * a propósito: si alguien quita el atenuador el dibujo sigue siendo
 * correcto. El atenuador es una mejora visual, no lo que sostiene la
 * geometría.
 */
export const DISP = 0.25;

/** Aplastado en y de las flores y del halo de fondo, que son una sola capa. */
export const APLANADO = 0.55;

/**
 * Aplastado por capa de polvo: [adelante, atrás]. La de atrás es la MÁS
 * aplanada porque se ve más de canto — la misma relación que tenía el
 * código viejo con 0.53 y 0.42.
 */
export const APLANADO_CAPA = [0.58, 0.46];

/** El mayor de los tres en una caja ancha. Ver aplanadoDelCielo(). */
export const APLANADO_MAX = 0.58;

/**
 * El aplanado NO es constante: se cede en cajas altas y angostas.
 *
 * `radioUtil` lo manda el ancho en un telefono, asi que con 0.58 fijo el disco
 * medía 316x174 dentro de una caja de 556 de alto: 236px de negro arriba y
 * ~200 abajo. Medido en navegador. El aplanado existe para que la galaxia
 * entre a lo ancho; en una caja alta lo que sobra es alto, y eso es
 * exactamente lo que hay que gastar.
 *
 *   razon = ancho/alto     2.0 (escritorio) -> 0.58   la galaxia de canto
 *                          0.8 (telefono)   -> 0.95   casi de frente
 */
export function aplanadoDelCielo(ancho, alto) {
  const razon = alto > 0 ? ancho / alto : 2;
  const k = Math.min(1, Math.max(0, (2 - razon) / 1.2));
  return APLANADO_MAX + (0.95 - APLANADO_MAX) * k;
}

/**
 * Los dos lóbulos del corazón, de donde salen los brazos.
 *
 * ANCLA ya lleva TODA la separación entre brazos: 0.55π − (−0.45π) = π.
 * NO sumarle además brazo·(2π/BRAZOS): eso agrega un segundo π y deja los
 * dos brazos exactamente encima, o sea un disco uniforme que se lee como
 * un átomo. Pasó, y sobrevivió a dos rondas de revisión.
 */
export const ANCLA = [-0.45 * Math.PI, 0.55 * Math.PI];

/**
 * Radios del cielo, derivados del espacio disponible y no de un factor mágico.
 *
 * `r0 + rMax === radioUtil` es una invariante, no una estimación: radioUtil
 * está construido para que el disco entero entre en la caja en los dos ejes.
 * El divisor es APLANADO_MAX y no APLANADO porque el eje y se mide contra el
 * aplanado más grande que se use.
 *
 * Y resuelve solo el caso apretado: cuando la caja es angosta, el Math.min
 * recorta r0 y EL CORAZÓN SE ACHICA en vez de que los brazos se salgan. Por
 * eso el corazón se dibuja con escalaCorazon y no con escala.
 *
 *        ancho·0.47
 *   ├───────────────────┤
 *   │   r0   │   rMax   │      r0   = el corazón + su resplandor
 *   ├────────┼──────────┤      rMax = lo que queda para los brazos
 *   0      ~0.38     radioUtil
 */
export function radiosDelCielo(ancho, alto, escala) {
  const aplMax = aplanadoDelCielo(ancho, alto);
  const radioUtil = Math.max(0, Math.min(ancho * 0.47, (alto * 0.47) / aplMax));
  const r0 = Math.min(CORAZON_ANCHO * CORAZON_U * RESPLANDOR * escala, radioUtil * 0.38);
  const rMax = radioUtil - r0;
  const escalaCorazon = r0 / (CORAZON_ANCHO * CORAZON_U * RESPLANDOR);
  // Los tres aplanados viajan CON los radios: separarlos es la via directa a
  // que el disco se mida con uno y se dibuje con otro.
  const aplanado = {
    max: aplMax,
    base: aplMax * (APLANADO / APLANADO_MAX),
    capa: [aplMax, aplMax * (APLANADO_CAPA[1] / APLANADO_CAPA[0])],
  };
  return { radioUtil, r0, rMax, escalaCorazon, aplanado };
}

/**
 * Un punto sobre un brazo.
 *
 * `t` ∈ [0,1] es el avance a lo largo del brazo, o sea radio normalizado.
 * NO es el reloj: el reloj también se llama t en galaxia() y en latido(),
 * y son cosas distintas.
 *
 * El exponente 0.9 y el Math.pow(azar(), 0.55) con que flores.js siembra
 * están ACOPLADOS: componen a ≈sqrt(azar()), que es el muestreo de área
 * uniforme sobre un disco. Tocar uno solo desbalancea la densidad sin que
 * nada avise.
 */
export function puntoEspiral(brazo, t, radios, opciones = {}) {
  const { disp = 0, aplanado = radios.aplanado?.base ?? APLANADO, cx = 0, cy = 0 } = opciones;
  const a = ANCLA[brazo] + t * VUELTA + disp;
  const r = radios.r0 + Math.pow(t, 0.9) * radios.rMax;
  return { a, r, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * aplanado };
}

// ─────────────────────────────────────────────────────────────
//  Las flores
// ─────────────────────────────────────────────────────────────

/**
 * El tamaño de la flor se mide contra el DISCO, no contra `escala`.
 *
 * Las dos medidas divergen 1,7× entre escritorio y móvil: el disco vale
 * 572 escalas a 1422×840 y 338 a 414×520. Con `* escala` las flores
 * pesaban 1,7× más dentro del cuadro en móvil, que es el defecto de
 * "flores gigantes, universo chico" volviendo por la puerta de atrás.
 *
 * Los coeficientes son la MITAD de los que traía el diseño (0,075 y 0,105),
 * y se bajaron mirando la pantalla, no calculando. Con los originales las
 * flores medían 50–120px de radio contra los 33–71 de la versión vieja: se
 * comían la galaxia que B1–B4 acababa de arreglar. Estos dan 30–58px, que es
 * el rango que deja ver los brazos entre las flores.
 */
export function tamanoFlor(t, radios) {
  return (0.036 + (1 - t) * 0.045) * (radios.r0 + radios.rMax);
}

/**
 * La misma escala, pero desde el campo `z` que MENSAJES ya tiene.
 *
 * Existe para que recortar el paso de las flores-sobre-los-brazos sea de
 * verdad posible: el tamaño por `t` necesita el remapeo, este no. Sin
 * esta función, "cortar ese paso" se llevaba puesto también el arreglo
 * del tamaño, en silencio.
 */
export const Z_MAX = 1.04;

export function tamanoFlorPorZ(z, radios) {
  return tamanoFlor(Math.min(1, Math.max(0, z / Z_MAX)), radios);
}

/**
 * Cuanto se extiende el DIBUJO de la flor mas alla de su centro, en unidades
 * de `tam`. Salen de girasol() en flores.js y hay que moverlas con el:
 *   halo   arc(0, 0, tam*1.45)            -> 1.45 en los cuatro lados
 *   petalo ellipse(0, -tam*0.58, _, 0.72) -> 1.30
 *   tallo  quadraticCurveTo(.., tam*2.1)  -> 2.10 SOLO hacia abajo
 *   hojas  ellipse(.., tam*1.52, _, 0.42) -> 1.94 hacia abajo
 *
 * Tratar la flor como un circulo de radio `tam` subestima el alto por mas del
 * doble y la deja cortada por el borde de abajo. Se vio en pantalla: la flor
 * de mas afuera salia partida en todas las variantes.
 */
export const FLOR_EXT = { lado: 1.45, arriba: 1.45, abajo: 2.10 };

/**
 * Recorta `t` hacia adentro hasta que la flor entera entre en la caja.
 *
 * Termina siempre: el radio es monótono creciente en t y el centro está
 * siempre adentro, así que bajar t converge. Tope de 45 pasos y piso en
 * 0.1. Con los radios derivados de radiosDelCielo() no debería dispararse
 * nunca; si se dispara, la caja quedó chica y hay que mirar la caja.
 */
export function recortarT(brazo, t, radios, caja, disp = 0) {
  const { ancho, alto, cx, cy } = caja;
  let actual = t;
  for (let i = 0; i < 45 && actual > 0.1; i++) {
    // El disp TIENE que entrar acá: si el recorte valida un punto y el dibujo
    // usa otro, la flor se sale igual y el clamp da una falsa sensacion de
    // seguridad. Paso exactamente el mismo desvio con el que se va a dibujar.
    const p = puntoEspiral(brazo, actual, radios, { cx, cy, disp });
    const tam = tamanoFlor(actual, radios);
    if (p.x - tam * FLOR_EXT.lado >= 0 && p.x + tam * FLOR_EXT.lado <= ancho
      && p.y - tam * FLOR_EXT.arriba >= 0 && p.y + tam * FLOR_EXT.abajo <= alto) break;
    actual = Math.max(0.1, actual - 0.02);
  }
  return actual;
}
