"""Diagnose: was steht wirklich in der Werkzeugliste.

English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT.
"""
import os

from playwright.sync_api import sync_playwright

PORT = os.environ.get("OPENMANATEE_PORT", "5173")
BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + PORT)
AUFTRAG = "Führe im Terminal den Befehl aus: sleep 5. Danach antworte mit dem einen Wort fertig."

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.goto(BASIS + "/session/manatee", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.fill("input", AUFTRAG)
    pg.keyboard.press("Enter")

    for runde in range(40):
        pg.wait_for_timeout(800)
        stand = pg.evaluate(
            """() => {
                const liste = document.querySelector('.werkzeugliste');
                const zeilen = document.querySelectorAll('.kopfzeile');
                return {
                    liste: !!liste,
                    zeilen: zeilen.length,
                    erste: zeilen.length ? zeilen[0].innerText.replace(/\\n/g, ' | ') : '',
                    symbole: Array.from(document.querySelectorAll('.symbol')).map(s => s.className + ' [' + s.getAttribute('data-bewegung') + ']'),
                    dom: liste ? liste.innerHTML.slice(0, 400) : '',
                    laeuft: document.body.innerText.includes('Anhalten')
                };
            }"""
        )
        print(f"--- Runde {runde}: {stand['zeilen']} Zeilen, laeuft={stand['laeuft']}")
        if stand["zeilen"]:
            print("    erste Zeile:", stand["erste"][:120])
            print("    symbole:", stand["symbole"])
            print("    dom:", stand["dom"][:300])
        if not stand["laeuft"] and runde > 3 and stand["zeilen"]:
            break
    b.close()
