"""Prueft den Bausteinkatalog am echten Lauf im Browser.

Vier Faelle:
  1. kennzahl  -> Kennzahlenreihe gezeichnet
  2. liste mit boesem Inhalt -> gezeichnet, aber nichts ausgefuehrt
  3. tabelle   -> Tabelle gezeichnet
  4. unsinnige art -> faellt sauber auf Text zurueck, Seite bleibt heil

English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT, images in build/probe
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

faelle = {
    "kennzahl": (
        'Antworte ausschliesslich mit einem manatee-Baustein der Art kennzahl, titel "Projekt", '
        "mit den drei Werten: Dateien 42, Zeilen 5321, Pruefungen 20.",
        "(b) => { const s=[...document.querySelectorAll('.blase.agent')]; const l=s[s.length-1]||document; return { da: !!l.querySelector('.kennzahl'), zahl: (l.querySelector('.zahl')||{}).innerText || '', roh: l.innerText.includes('\"art\"') }; }",
    ),
    "liste": (
        'Antworte ausschliesslich mit einem manatee-Baustein der Art liste, titel "Werkzeuge", '
        'mit zwei Eintraegen. Beim ersten Eintrag ist rest genau: <img src=x onerror=alert(1)> boese',
        "(b) => { const s=[...document.querySelectorAll('.blase.agent')]; const l=s[s.length-1]||document; return { da: !!l.querySelector('.liste'), zeilen: l.querySelectorAll('.liste li').length, bilder: l.querySelectorAll('img').length, roh: l.innerText.includes('\"art\"') }; }",
    ),
    "tabelle": (
        'Antworte ausschliesslich mit einem manatee-Baustein der Art tabelle, kopf ["Datei","Zeilen"], '
        "zwei Zeilen: werkzeug.ts 218, antwort.ts 200.",
        "(b) => { const s=[...document.querySelectorAll('.blase.agent')]; const l=s[s.length-1]||document; return { da: !!l.querySelector('.tabelle'), zeilen: l.querySelectorAll('.tabelle tbody tr').length, roh: l.innerText.includes('\"art\"') }; }",
    ),
    "unsinn": (
        'Antworte ausschliesslich mit exakt diesem Text, ohne weiteren Kommentar: '
        '```manatee\n{"art":"quatsch","was":1}\n```',
        "(b) => { const s=[...document.querySelectorAll('.blase.agent')]; const l=s[s.length-1]||document; return { da: !!l.querySelector('pre.kasten'), bausteine: l.querySelectorAll('.baustein').length, heil: !!document.querySelector('input') }; }",
    ),
}

fehler: list[str] = []
ergebnis: dict[str, dict] = {}

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    def bei_dialog(d) -> None:
        fehler.append("Dialog ausgeloest!")
        d.dismiss()

    pg.on("dialog", bei_dialog)

    pg.goto(BASIS + "/session/manatee", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.evaluate("() => localStorage.clear()")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(1500)

    for name, (auftrag, messung) in faelle.items():
        pg.fill("input", auftrag)
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(2500)
        for _ in range(1200):
            if pg.evaluate("() => !document.querySelector('.lauf')"):
                break
            pg.wait_for_timeout(300)
        pg.wait_for_timeout(3000)
        ergebnis[name] = pg.evaluate(messung, None)
        pg.screenshot(path=f"{ORDNER}/baustein-{name}.png")

    b.close()

pruefungen = {
    "Kennzahl als Reihe gezeichnet": ergebnis.get("kennzahl", {}).get("da") is True,
    "Kennzahl zeigt Zahl und Marke": bool(ergebnis.get("kennzahl", {}).get("zahl", "").strip()),
    "Kein rohes JSON im Text": (
        not ergebnis.get("kennzahl", {}).get("roh", True)
        and not ergebnis.get("liste", {}).get("roh", True)
        and not ergebnis.get("tabelle", {}).get("roh", True)
    ),
    "Liste als Zeilen gezeichnet": ergebnis.get("liste", {}).get("da") is True,
    "Liste mit zwei Zeilen": int(ergebnis.get("liste", {}).get("zeilen", 0) or 0) == 2,
    "Nichts aus dem Feld ausgefuehrt": int(ergebnis.get("liste", {}).get("bilder", 1) or 0) == 0,
    "Tabelle als Tabelle gezeichnet": ergebnis.get("tabelle", {}).get("da") is True,
    "Tabelle mit zwei Zeilen": int(ergebnis.get("tabelle", {}).get("zeilen", 0) or 0) == 2,
    "Unsinn faellt auf Text zurueck": (
        ergebnis.get("unsinn", {}).get("da") is True
        and int(ergebnis.get("unsinn", {}).get("bausteine", 1) or 0) == 0
    ),
    "Seite bleibt heil": ergebnis.get("unsinn", {}).get("heil") is True,
    "Keine Konsolenfehler": not fehler,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("messungen:", ergebnis)
print("fehler:", fehler[:6] if fehler else "keine")
sys.exit(0 if all(pruefungen.values()) else 1)
