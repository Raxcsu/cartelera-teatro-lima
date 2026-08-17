#!/usr/bin/env python3
"""
validar_datos.py — la unica puerta de calidad de los datos.

Sin esto, el modelo de confianza es decorativo: nada impide que un
JSON malformado o una referencia rota lleguen a produccion y dejen la
app en blanco.

Uso:
    python scripts/validar_datos.py            # valida y reporta
    python scripts/validar_datos.py --deploy   # ademas falla si quedan
                                               # registros de muestra

Codigo de salida != 0 si hay errores. Pensado para usarse como hook
de pre-commit.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / "data"

# Lima cabe holgadamente aca. Una coordenada fuera de esta caja es un
# error de geocodificacion, no un teatro exotico.
LIMA = {"lat_min": -12.60, "lat_max": -11.60, "lng_min": -77.35, "lng_max": -76.60}

CONFIANZAS = {"confirmado", "probable", "sin_verificar"}
ESTADOS = {"disponible", "agotada", "cancelada"}
TIPOS = {"comedia", "drama", "musical", "danza", "infantil", "otro"}

errores: list[str] = []
avisos: list[str] = []


def err(msg: str) -> None:
    errores.append(msg)


def avi(msg: str) -> None:
    avisos.append(msg)


SLUG_MAX = 60  # DEBE coincidir con SLUG_MAX en js/logica.js


def slug(texto) -> str:
    """Mismo algoritmo que slug() en js/logica.js. Si divergen, los IDs
    generados por el script y por la app dejarian de coincidir."""
    if texto is None:
        return ""
    s = unicodedata.normalize("NFD", str(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    if len(s) <= SLUG_MAX:
        return s
    return re.sub(r"-[^-]*$", "", s[:SLUG_MAX]).rstrip("-")


def cargar(nombre: str, clave: str):
    ruta = DATA / nombre
    if not ruta.exists():
        err(f"{nombre}: no existe")
        return []
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(f"{nombre}: JSON invalido en linea {e.lineno} — {e.msg}")
        return []
    if clave not in datos:
        err(f"{nombre}: falta la clave '{clave}'")
        return []
    return datos[clave]


def url_valida(valor, ctx: str, campo: str) -> None:
    """Solo http y https llegan a un href de la app.

    urlSegura() en js/logica.js ya bloquea el resto en el navegador, pero
    ahi el dato malo ya viajo: el link simplemente no aparece y nadie se
    entera de por que. Acá falla ruidosamente, que es donde corresponde.
    """
    if valor is None:
        return
    if not isinstance(valor, str) or not re.match(r"^https?://", valor.strip(), re.I):
        err(f"{ctx}: '{campo}' = {valor!r} no es una URL http(s)")


def fecha_valida(valor, ctx: str, campo: str, obligatorio: bool = True) -> date | None:
    if valor is None:
        if obligatorio:
            err(f"{ctx}: '{campo}' es obligatorio")
        return None
    try:
        return datetime.strptime(str(valor), "%Y-%m-%d").date()
    except ValueError:
        err(f"{ctx}: '{campo}' = {valor!r} no es una fecha YYYY-MM-DD")
        return None


def main() -> int:
    deploy = "--deploy" in sys.argv
    hoy = date.today()

    teatros = cargar("teatros.json", "teatros")
    obras = cargar("obras.json", "obras")
    funciones = cargar("funciones.json", "funciones")
    lugares = cargar("lugares.json", "lugares")

    if errores:
        return reportar()

    ids_teatro = {t.get("id") for t in teatros}
    ids_obra = {o.get("id") for o in obras}

    # ── teatros ──────────────────────────────────────────────
    vistos = set()
    for t in teatros:
        ctx = f"teatro '{t.get('id')}'"
        if t.get("id") in vistos:
            err(f"{ctx}: id duplicado")
        vistos.add(t.get("id"))

        esperado = slug(t.get("nombre"))
        if t.get("id") != esperado:
            err(f"{ctx}: el id no es determinista. Deberia ser '{esperado}'")

        url_valida(t.get("web"), ctx, "web")
        url_valida(t.get("fuente_url"), ctx, "fuente_url")

        lat, lng = t.get("lat"), t.get("lng")
        if lat is None or lng is None:
            avi(f"{ctx}: sin coordenadas. Geocodificar y VERIFICAR contra la direccion.")
        else:
            if not (LIMA["lat_min"] <= lat <= LIMA["lat_max"]):
                err(f"{ctx}: lat {lat} esta fuera de Lima")
            if not (LIMA["lng_min"] <= lng <= LIMA["lng_max"]):
                err(f"{ctx}: lng {lng} esta fuera de Lima")

    # ── obras ────────────────────────────────────────────────
    # Lo que ahora falta llenar. El reporte de abajo apunta aca porque es
    # aca donde se decide si la tarjeta tiene algo que contar.
    sin_sinopsis = sin_genero = sin_elenco = 0

    for o in obras:
        ctx = f"obra '{o.get('id')}'"
        ini = fecha_valida(o.get("temporada_inicio"), ctx, "temporada_inicio")
        fin = fecha_valida(o.get("temporada_fin"), ctx, "temporada_fin", obligatorio=False)
        if ini and fin and fin < ini:
            err(f"{ctx}: temporada_fin es anterior a temporada_inicio")

        if ini:
            esperado = f"{slug(o.get('titulo'))}-{ini.year}"
            if o.get("id") != esperado:
                err(f"{ctx}: el id no es determinista. Deberia ser '{esperado}'")

        url_valida(o.get("fuente_url"), ctx, "fuente_url")

        if o.get("tipo") not in TIPOS:
            err(f"{ctx}: tipo {o.get('tipo')!r} no esta en {sorted(TIPOS)}")
        if not o.get("idioma"):
            err(f"{ctx}: falta 'idioma'. ICPNA y Britanico montan obras en ingles.")

        # Mitigacion de derechos de autor: si hay imagen, hay credito.
        if o.get("imagen_local") and not o.get("imagen_credito"):
            err(f"{ctx}: tiene imagen_local sin imagen_credito")
        if str(o.get("imagen_local") or "").startswith("http"):
            err(f"{ctx}: imagen_local debe ser una ruta local, no una URL externa")

        # `elenco` es la lista de nombres TAL COMO los publica la fuente.
        # Nadie decide aca quien es "conocido": si la fuente lo nombra es
        # porque es el gancho de la obra, y si no nombra a nadie va [].
        # Deducir fama seria inventar igual que inventar un precio.
        elenco = o.get("elenco")
        if elenco is None:
            avi(f"{ctx}: sin 'elenco'. Va [] si la fuente no publica nombres.")
            elenco = []
        elif not isinstance(elenco, list):
            err(f"{ctx}: 'elenco' tiene que ser una lista, no {type(elenco).__name__}")
            elenco = []
        else:
            for n in elenco:
                if not isinstance(n, str) or not n.strip():
                    err(f"{ctx}: el elenco trae un nombre vacio o que no es texto: {n!r}")

        # Regla 2: la fuente viaja con el dato. Vale igual para un texto
        # que para un precio — una sinopsis sin procedencia es una sinopsis
        # que nadie puede volver a verificar.
        if (o.get("sinopsis") or elenco) and not o.get("fuente_url"):
            err(f"{ctx}: tiene sinopsis o elenco pero no tiene fuente_url")

        if not str(o.get("sinopsis") or "").strip():
            sin_sinopsis += 1
        if o.get("tipo") in (None, "", "otro"):
            sin_genero += 1
        if not elenco:
            sin_elenco += 1

    # ── funciones ────────────────────────────────────────────
    por_confianza = {c: 0 for c in CONFIANZAS}
    vistos = set()

    for f in funciones:
        ctx = f"funcion '{f.get('id')}'"
        if f.get("id") in vistos:
            err(f"{ctx}: id duplicado")
        vistos.add(f.get("id"))

        if f.get("obra_id") not in ids_obra:
            err(f"{ctx}: obra_id '{f.get('obra_id')}' no existe en obras.json")
        if f.get("teatro_id") not in ids_teatro:
            err(f"{ctx}: teatro_id '{f.get('teatro_id')}' no existe en teatros.json")

        fecha_valida(f.get("fecha"), ctx, "fecha")
        if not re.fullmatch(r"\d{2}:\d{2}", str(f.get("hora") or "")):
            err(f"{ctx}: hora {f.get('hora')!r} no es HH:MM")

        esperado = f"{f.get('obra_id')}-{f.get('teatro_id')}-{f.get('fecha')}-{str(f.get('hora') or '').replace(':', '')}"
        if f.get("id") != esperado:
            err(f"{ctx}: el id no es determinista. Deberia ser '{esperado}'")

        url_valida(f.get("url_entradas"), ctx, "url_entradas")
        url_valida(f.get("fuente_url"), ctx, "fuente_url")

        pmin, pmax = f.get("precio_min"), f.get("precio_max")
        for nombre, p in (("precio_min", pmin), ("precio_max", pmax)):
            if p is not None and (not isinstance(p, (int, float)) or p < 0):
                err(f"{ctx}: {nombre} = {p!r} no es un numero valido")
        if pmin is not None and pmax is not None and pmax < pmin:
            err(f"{ctx}: precio_max es menor que precio_min")

        conf = f.get("confianza")
        if conf not in CONFIANZAS:
            err(f"{ctx}: confianza {conf!r} no esta en {sorted(CONFIANZAS)}")
        else:
            por_confianza[conf] += 1

        if f.get("estado") not in ESTADOS:
            err(f"{ctx}: estado {f.get('estado')!r} no esta en {sorted(ESTADOS)}")

        # Regla 1: no inventar.
        #
        # 'confirmado' cambio de sujeto cuando el precio salio de pantalla.
        # Antes certificaba el precio y por eso se exigia precio_min; ahora
        # certifica LA FUNCION: "esto va a ocurrir, en esta fecha y en este
        # teatro". La prueba mas fuerte de eso es poder comprar la entrada,
        # asi que url_entradas se exige junto con fuente y fecha.
        #
        # Los registros de andamiaje quedan exentos: no tienen fuente real
        # porque no son datos reales. El flag --deploy impide que salgan.
        if conf == "confirmado" and not f.get("_muestra"):
            if not f.get("verificado_el"):
                err(f"{ctx}: dice 'confirmado' pero no tiene verificado_el")
            if not f.get("fuente_url"):
                err(f"{ctx}: dice 'confirmado' pero no tiene fuente_url")
            if not f.get("url_entradas"):
                err(f"{ctx}: dice 'confirmado' pero no tiene url_entradas. "
                    "Confirmado es 'esta funcion va a ocurrir'; sin donde "
                    "comprarla, usa 'probable'.")

        ver = fecha_valida(f.get("verificado_el"), ctx, "verificado_el", obligatorio=False)
        if ver and ver > hoy:
            err(f"{ctx}: verificado_el esta en el futuro")

    # ── lugares ──────────────────────────────────────────────
    for l in lugares:
        ctx = f"lugar '{l.get('id')}'"
        esperado = f"{slug(l.get('nombre'))}-{slug(l.get('distrito'))}"
        if l.get("id") != esperado:
            err(f"{ctx}: el id no es determinista. Deberia ser '{esperado}'")
        gmin, gmax = l.get("gasto_min"), l.get("gasto_max")
        if gmin is not None and gmax is not None and gmax < gmin:
            err(f"{ctx}: gasto_max es menor que gasto_min")
        for campo in ("abre", "cierra_cocina"):
            v = l.get(campo)
            if v is not None and not re.fullmatch(r"\d{2}:\d{2}", str(v)):
                err(f"{ctx}: {campo} = {v!r} no es HH:MM")
        if not l.get("cierra_cocina"):
            avi(f"{ctx}: sin cierra_cocina. Nunca se va a proponer para cenar despues.")

    # ── registros de muestra ─────────────────────────────────
    muestras = sum(
        1 for grupo in (teatros, obras, funciones, lugares) for r in grupo if r.get("_muestra")
    )
    if muestras:
        if deploy:
            err(f"quedan {muestras} registros de andamiaje (_muestra:true). No se despliega con datos falsos.")
        else:
            avi(f"{muestras} registros de andamiaje (_muestra:true) todavia presentes.")

    # ── reporte de cobertura ─────────────────────────────────
    total = len(funciones)
    print("\n  COBERTURA DE CONFIANZA")
    print("  " + "-" * 44)
    for c in ("confirmado", "probable", "sin_verificar"):
        n = por_confianza[c]
        pct = f"{100 * n / total:.0f}%" if total else "—"
        barra = "#" * round(20 * n / total) if total else ""
        print(f"  {c:<14} {n:>4}  {pct:>4}  {barra}")
    print(f"  {'TOTAL':<14} {total:>4}\n")

    # Lo que le falta a la PANTALLA, que ya no es el precio. Una obra sin
    # sinopsis, sin genero y sin elenco produce una tarjeta que solo sabe
    # decir el titulo y la hora, y eso no ayuda a decidir si ir.
    n_obras = len(obras)
    print("  COBERTURA DE LA OBRA")
    print("  " + "-" * 44)
    for etiqueta, n in (("sin sinopsis", sin_sinopsis),
                        ("sin genero", sin_genero),
                        ("sin elenco", sin_elenco)):
        pct = f"{100 * n / n_obras:.0f}%" if n_obras else "—"
        barra = "#" * round(20 * n / n_obras) if n_obras else ""
        print(f"  {etiqueta:<14} {n:>4}  {pct:>4}  {barra}")
    print(f"  {'TOTAL':<14} {n_obras:>4}\n")

    return reportar()


def reportar() -> int:
    for a in avisos:
        print(f"  AVISO  {a}")
    for e in errores:
        print(f"  ERROR  {e}")
    if errores:
        print(f"\n  FALLO: {len(errores)} error(es), {len(avisos)} aviso(s)\n")
        return 1
    print(f"  OK: sin errores, {len(avisos)} aviso(s)\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
