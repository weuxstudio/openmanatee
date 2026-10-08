"""Prueft die App im Browser: alle Routen, Bedienablauf, Konsolenfehler.

Adresse ueber OPENMANATEE_BASIS setzen, um durch den Tailnet-Proxy zu pruefen:
  OPENMANATEE_BASIS=https://mein-rechner.example:8446 python3 pruefen.py
English: OPENMANATEE_PORT sets only the port (default 5173); images go to
build/probe unless OPENMANATEE_BILDORDNER points elsewhere.
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent
PORT = os.environ.get("OPENMANATEE_PORT", "5173")
BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + PORT)
OUT = Path(os.environ.get("OPENMANATEE_BILDORDNER", str(WURZEL / "build" / "probe")))
OUT.mkdir(parents=True, exist_ok=True)

fehler: list[str] = []


def laufen() -> int:
    with sync_playwright() as p:
        try:
            b = p.chromium.launch(channel="chrome", headless=True)
        except Exception:
            b = p.chromium.launch(headless=True)
        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg.on("console", lambda m: fehler.append(f"[konsole.{m.type}] {m.text}")
              if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

        routen = [("/", "app-start"), ("/agenten", "app-agenten"),
                  ("/aufgaben", "app-aufgaben"), ("/ablage", "app-ablage")]
        for weg, name in routen:
            pg.goto(BASIS + weg, wait_until="networkidle")
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(OUT / f"{name}.png"))

        # Startseite: Figur oeffnen
        pg.goto(BASIS + "/", wait_until="networkidle")
        pg.click("button.held")
        pg.wait_for_url("**/session/**", timeout=8000)
        pg.wait_for_timeout(500)

        # Lauf starten
        pg.get_by_text("Starte mit 1").click()
        pg.wait_for_timeout(1200)
        schritte_1 = pg.locator(".werkzeug").count()
        pg.screenshot(path=str(OUT / "app-lauf.png"))

        # Freigabe muss erscheinen
        pg.wait_for_selector("text=Freigabe nötig", timeout=12000)
        pg.screenshot(path=str(OUT / "app-freigabe.png"))
        print(f"schritte vor freigabe: {schritte_1}")

        # Freigabe erlauben, Lauf laeuft weiter bis fertig
        pg.get_by_text("Einmal erlauben").click()
        pg.wait_for_timeout(9000)
        schritte_2 = pg.locator(".werkzeug").count()
        pg.screenshot(path=str(OUT / "app-fertig.png"))
        print(f"schritte nach freigabe: {schritte_2}")

        # Ablehnen pruefen
        pg.goto(BASIS + "/session/manatee", wait_until="networkidle")
        pg.get_by_text("Weiterlaufen lassen").click() if pg.get_by_text("Weiterlaufen lassen").count() else None
        pg.wait_for_timeout(1000)
        b.close()

    if fehler:
        print("fehler:")
        for f in fehler[:20]:
            print("  " + f)
        return 1
    print("keine konsolen- oder seitenfehler")
    return 0


sys.exit(laufen())
