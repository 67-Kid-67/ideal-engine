import asyncio, sys
from playwright.async_api import async_playwright

files = [l.strip() for l in open('/tmp/failjs.txt')]

async def main():
    bad = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome", args=["--no-sandbox"])
        page = await browser.new_page()
        await page.goto("http://127.0.0.1:4175/", wait_until="domcontentloaded")
        for f in files:
            r = await page.evaluate("""async (f) => { try { await import('/' + f + '?v=' + Date.now()); return 'OK'; } catch(e){ const s=String(e.stack||e); const m=s.match(/(https?:\\/\\/[^\\n]*?):(\\d+):(\\d+)/); return 'ERR:'+String(e.message).slice(0,80)+'|'+(m?m[1]+':'+m[2]+':'+m[3]:''); } }""", f)
            if not r.startswith('OK'):
                bad.append((f, r))
                print(f, '::', r[:200])
        await browser.close()
    open('/tmp/badfiles.txt','w').write('\n'.join(f for f,_ in bad))

asyncio.run(main())
