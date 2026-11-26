#!/usr/bin/env python3
"""Screenshot NestEgg's views with headless Chromium (Playwright).

Opens the site straight from disk (file://) — the sandboxed Chromium
cannot reach localhost, and the site loads nothing over the network anyway.
Reports any console error, so a broken view fails loudly.
"""

import sys
from playwright.sync_api import sync_playwright

ROOT = "/home/hatch/workspace/makefun/best-household-budget-site-20261126-2300"
OUT = ROOT + "/screenshots"
BASE = "file://" + ROOT + "/app/index.html"
VIEWS = [
    ("1-dashboard.jpg", "#/dashboard", 1280, 800),
    ("2-transactions.jpg", "#/transactions", 1280, 800),
    ("3-budgets.jpg", "#/budgets", 1280, 800),
    ("4-phone.jpg", "#/dashboard", 390, 844),
]

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path="/opt/hatch/bin/hatch-chromium-sandbox",
        args=["--no-sandbox", "--allow-file-access-from-files"],
    )
    for name, frag, w, h in VIEWS:
        page = browser.new_page(viewport={"width": w, "height": h})
        page.on("console", lambda m: errors.append(f"{name}: {m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"{name}: pageerror: {e}"))
        page.goto(BASE + frag)
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/{name}", type="jpeg", quality=85)
        print(name, "done")
        page.close()
    browser.close()

if errors:
    print("CONSOLE ERRORS:")
    for e in errors:
        print(" ", e)
    sys.exit(1)
print("all screenshots taken, no console errors")
