"""Prueft den echten Chat in der Oberflaeche gegen den laufenden Hermes-Server.

Oeffnet die Sitzungsseite, sendet eine Nachricht, wartet auf eine echte Antwort
und legt ein Bildschirmfoto ab. Mit gesetztem APP_TOKEN meldet sich das Skript
vorher ueber die Zugangstuer an.
English: with an empty APP_TOKEN it reads the token generated at startup from .env.
"""
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + os.environ.get("OPENMANATEE_PORT", "5173"))
ZIEL = os.environ.get(
    "OPENMANATEE_BILD",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "probe", "app-echt-live.png"),
)
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

    New code, English: without this the page would stop at the access door.
    The token is only sent to /anmelden and never printed.
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


with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)

    kontext = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    token = token_aus_umgebung()
    if token:
        name, wert = login_cookie(BASIS, token)
        if name:
            kontext.add_cookies(
                [{"name": name, "value": wert, "domain": urlparse(BASIS).hostname, "path": "/"}]
            )

    pg = kontext.new_page()
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    pg.goto(BASIS + "/session/manatee", wait_until="networkidle")
    pg.evaluate("() => localStorage.clear()")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(1200)

    verbunden = "Verbunden" in pg.inner_text("body")

    pg.fill(".eingabe-feld input", "Antworte mit genau einem Wort: verbunden")
    pg.press(".eingabe-feld input", "Enter")
    print("gesendet, warte auf die Antwort")

    try:
        pg.wait_for_selector("text=verbunden", timeout=150000)
        wartet = False
    except Exception:
        wartet = True
    pg.wait_for_timeout(2000)

    text = pg.inner_text("body")
    laeuft = pg.locator("text=Anhalten").count()
    os.makedirs(os.path.dirname(ZIEL), exist_ok=True)
    pg.screenshot(path=ZIEL, full_page=False)
    b.close()

pruefungen = {
    "Anzeige Verbunden": verbunden,
    "Antwort da": not wartet and text.lower().count("verbunden") >= 2,
    "Lauf beendet": laeuft == 0,
    "kein Hinweis auf Fehler": "Kein Zug" not in text,
    "keine unbekannten Ereignisse": "noch nicht zugeordnet" not in text,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("fehler:", fehler[:5] if fehler else "keine")
print("bild:", ZIEL)
sys.exit(0 if all(pruefungen.values()) and not fehler else 1)
