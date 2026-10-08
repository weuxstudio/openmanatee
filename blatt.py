"""Legt die drei Bildschirmfotos der laufenden App nebeneinander auf ein Blatt.

English: images are read from build/probe (OPENMANATEE_BILDORDNER), not from a
fixed folder.
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent
OUT = Path(os.environ.get("OPENMANATEE_BILDORDNER", str(WURZEL / "build" / "probe")))
OUT.mkdir(parents=True, exist_ok=True)
seiten = [("app-start.png", "Start"), ("app-freigabe.png", "Sitzung"), ("app-agenten.png", "Agenten")]

bilder = "".join(
    f'<figure><img src="{name}"><figcaption>{titel}</figcaption></figure>' for name, titel in seiten
)
html = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ background:#E9E9EC; padding:30px; display:flex; gap:26px; align-items:flex-start;
         font:400 13px/1.4 -apple-system,"SF Pro Text",Arial,sans-serif; color:#6E6E73; }}
  figure {{ display:flex; flex-direction:column; gap:9px; align-items:center; }}
  img {{ width:390px; border-radius:26px; display:block;
         box-shadow:0 0 0 9px #F2F2F4, 0 0 0 11px #DCDCE0, 0 20px 44px rgba(20,20,25,.16); }}
  figcaption {{ font-weight:600; letter-spacing:.02em; }}
</style></head><body>{bilder}</body></html>"""
(OUT / "screens-app.html").write_text(html, encoding="utf-8")

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1330, "height": 940}, device_scale_factor=2)
    pg.goto((OUT / "screens-app.html").as_uri())
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / "app-drei.png"))
    b.close()
print("out/app-drei.png", (OUT / "app-drei.png").stat().st_size)
