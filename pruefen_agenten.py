"""Prueft die Agentenseite gegen die echten Profile und legt ein Bildschirmfoto ab.

English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT, image in build/probe
(OPENMANATEE_BILDORDNER).
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent
PORT = os.environ.get("OPENMANATEE_PORT", "5173")
BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + PORT)
ORDNER = Path(os.environ.get("OPENMANATEE_BILDORDNER", str(WURZEL / "build" / "probe")))
ORDNER.mkdir(parents=True, exist_ok=True)
ZIEL = str(ORDNER / "app-agenten.png")
fehler: list[str] = []

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    pg.goto(BASIS + "/agenten", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    text = pg.inner_text("body")
    figuren = pg.locator("svg[role='img']").count()
    pg.screenshot(path=ZIEL)
    b.close()

pruefungen = {
    "Experte recherche da": "recherche" in text,
    "Experte ordnung da": "ordnung" in text,
    "Beschreibung sichtbar": "Quellen" in text,
    "Zustand bereit": "bereit" in text,
    "Chef oben": "OpenManatee" in text,
    "Figur je Experte": figuren >= 3,
    "kein Mustertext": "Deine Agenten" not in text,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("figuren:", figuren)
print("fehler:", fehler[:5] if fehler else "keine")
print("bild:", ZIEL)
sys.exit(0 if all(pruefungen.values()) and not fehler else 1)
