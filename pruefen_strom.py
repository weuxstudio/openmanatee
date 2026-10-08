"""Prueft den echten Weg gegen den Ersatz-Server: Sitzung anlegen, Nachricht senden,
Antwort Stueck fuer Stueck, Werkzeugzeilen, Ende. Braucht HERMES_KEY in .env und den
Ersatz-Server auf 8643, siehe stub_hermes.py.
English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT, images in build/probe
(OPENMANATEE_BILDORDNER)."""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent
PORT = os.environ.get("OPENMANATEE_PORT", "5173")
BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + PORT)
ORDNER = Path(os.environ.get("OPENMANATEE_BILDORDNER", str(WURZEL / "build" / "probe")))
ORDNER.mkdir(parents=True, exist_ok=True)
fehler: list[str] = []

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    pg.goto(BASIS + "/session/manatee", wait_until="networkidle")
    pg.wait_for_timeout(600)

    pg.fill(".eingabe-feld input", "Was steht heute an?")
    pg.press(".eingabe-feld input", "Enter")

    pg.wait_for_selector("text=Ich sehe zwei offene Punkte.", timeout=20000)
    pg.wait_for_timeout(2500)

    text = pg.inner_text("body")
    schritte = pg.locator(".werkzeug").count()
    pg.screenshot(path=str(ORDNER / "app-echt.png"))
    b.close()

pruefungen = {
    "antwort vollstaendig": "Ich sehe zwei offene Punkte." in text and "Entwurf angelegt" in text,
    "werkzeugzeilen": schritte >= 2,
    "datei gemerkt": "entwurf.md" in text,
    "keine fehlermeldung": "Kein Zug" not in text,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("schritte:", schritte)
print("fehler:", fehler[:5] if fehler else "keine")
sys.exit(0 if all(pruefungen.values()) and not fehler else 1)
