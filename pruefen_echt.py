"""Prueft, ob der Schluessel je im Browser ankommt.

Sammelt alles, was der Browser wirklich laedt, und sucht darin nach dem Schluessel.
Zusaetzlich laeuft die Startseite einmal durch und wird auf Fehler geprueft.
Mit gesetztem APP_TOKEN meldet sich das Skript vorher ueber die Zugangstuer an.
English: with an empty APP_TOKEN it reads the token generated at startup from .env.
"""
import os
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + os.environ.get("OPENMANATEE_PORT", "5173"))
SCHLUESSEL = os.environ.get("OPENMANATEE_SCHLUESSEL", "probe-schluessel")
BILD = os.environ.get(
    "OPENMANATEE_BILD",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "probe", "app-echt.png"),
)

geladen: list[str] = []
treffer: list[str] = []
fehler: list[str] = []


def token_aus_umgebung() -> str:
    """Read APP_TOKEN from the environment, otherwise from the project .env.

    New code, English: case 2 of the door writes a generated token into .env,
    so the check can log in instead of stopping at the door. The value itself
    is never printed.
    """
    gesetzt = os.environ.get("APP_TOKEN", "").strip()
    if gesetzt:
        return gesetzt
    dotenv = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    try:
        with open(dotenv, encoding="utf-8") as datei:
            for zeile in datei:
                zeile = zeile.strip()
                if zeile.startswith("APP_TOKEN="):
                    return zeile.split("=", 1)[1].strip()
    except OSError:
        pass
    return ""


def login_cookie(basis: str, token: str) -> tuple[str, str]:
    """Log in over HTTP and return the signed cookie as (name, value).

    New code, English: the browser checks have to pass the access door, too.
    The token itself is only sent to /anmelden, never printed.
    """
    daten = urllib.parse.urlencode({"token": token}).encode()
    anfrage = urllib.request.Request(
        basis + "/anmelden",
        data=daten,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": basis,
            "Accept": "text/html",
        },
    )

    class KeinWeiterleiten(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None

    oeffner = urllib.request.build_opener(KeinWeiterleiten)
    try:
        antwort = oeffner.open(anfrage, timeout=15)
    except urllib.error.HTTPError as e:
        antwort = e
    roh = antwort.headers.get("Set-Cookie") or ""
    teil = roh.split(";", 1)[0]
    if "=" not in teil:
        return "", ""
    name, wert = teil.split("=", 1)
    return name, wert


def bearbeiten(antwort) -> None:
    try:
        art = (antwort.headers.get("content-type") or "")
        if "javascript" in art or "text/html" in art:
            text = antwort.text()
            geladen.append(antwort.url)
            if SCHLUESSEL in text:
                treffer.append(antwort.url)
    except Exception:
        pass


with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)

    kontext = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    token = token_aus_umgebung()
    angemeldet = not token
    if token:
        name, wert = login_cookie(BASIS, token)
        if name:
            kontext.add_cookies(
                [{"name": name, "value": wert, "domain": urlparse(BASIS).hostname, "path": "/"}]
            )
            angemeldet = True

    pg = kontext.new_page()
    pg.on("response", bearbeiten)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    pg.goto(BASIS + "/", wait_until="networkidle")
    pg.wait_for_timeout(700)
    pg.click("button.held")                       # Sitzung oeffnen
    pg.wait_for_timeout(900)
    pg.goto(BASIS + "/agenten", wait_until="networkidle")
    pg.wait_for_timeout(500)

    text = pg.inner_text("body")
    os.makedirs(os.path.dirname(BILD), exist_ok=True)
    pg.screenshot(path=BILD)
    b.close()

print(f"vom browser geladen: {len(geladen)} dokumente")
print("angemeldet:", "ja" if angemeldet else "nein")
print("schluessel im browser:", "GEFUNDEN in " + ", ".join(treffer) if treffer else "nein")
print("musterhinweis sichtbar:", "Musterdaten" in text)
print("fehler:", fehler[:5] if fehler else "keine")
