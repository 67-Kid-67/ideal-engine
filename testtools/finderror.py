import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome", args=["--no-sandbox"])
        page = await browser.new_page()
        logs = []
        page.on("console", lambda m: logs.append((m.type, m.text, m.location)))
        page.on("pageerror", lambda e: logs.append(("pageerror", str(e), getattr(e, "stack", "")[:500])))
        await page.goto("http://127.0.0.1:4175/", wait_until="load")
        await page.wait_for_timeout(8000)
        for t, m, loc in logs:
            print(t, "::", m[:200], "::", loc)
        # try loading each module individually to find the broken one
        mods = ["assets/persisted-sODZFpJB.js","assets/generatedCues-B42pQoPH.js","assets/controllers-DoMZqhdH.js","assets/main-Ujn3KlNv.js","assets/credits-settings.js"]
        for mod in mods:
            res = await page.evaluate("""async (mod) => { try { await import('/' + mod); return 'OK'; } catch (e) { return String(e).slice(0,200); } }""", mod)
            print(mod, "->", res)
        await browser.close()

asyncio.run(main())
