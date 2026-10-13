import asyncio, json, sys
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:4175/"

async def main():
    errors = []
    failed = []
    responses = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome", args=["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        page.on("console", lambda m: errors.append(("console:" + m.type, m.text)) if m.type in ("error",) else None)
        page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
        page.on("requestfailed", lambda r: failed.append((r.url, r.failure)))

        async def on_resp(r):
            responses[r.url] = r.status
        page.on("response", on_resp)

        await page.goto(URL, wait_until="load")
        try:
            await page.wait_for_selector("#app canvas", timeout=30000)
            print("CANVAS APPEARED")
        except Exception as e:
            print("NO CANVAS:", e)
        html = await page.evaluate("() => document.getElementById('app') ? document.getElementById('app').innerHTML.slice(0,2000) : 'NO APP'")
        print("APP HTML:", html[:1500])
        brand = await page.evaluate("() => { const b = document.querySelector('#brand-screen'); return b ? getComputedStyle(b).opacity + '|' + getComputedStyle(b).visibility : 'none' }")
        print("BRAND SCREEN:", brand)
        loading = await page.evaluate("() => !!document.querySelector('#loading')")
        print("LOADING PRESENT:", loading)
        await page.screenshot(path="/tmp/shot_after30.png")
        print("\n=== PAGE ERRORS ===")
        for t, m in errors[:40]:
            print(t, "::", m[:300])
        print("\n=== FAILED REQUESTS ===")
        for u, f in failed[:40]:
            print(u, "::", f)
        print("\n=== NON-200 RESPONSES ===")
        for u, s in responses.items():
            if s >= 400 or s == 0:
                print(s, u)
        await browser.close()

asyncio.run(main())
