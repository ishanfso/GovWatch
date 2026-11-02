// Interactive browser driver for a supervised, one-off filing on a government portal.
// Keeps ONE browser session alive between chat turns. Claude sends one command at a time
// over a local HTTP port; the human supplies OTPs and CAPTCHA answers through chat.
// Nothing is submitted without an explicit "click" on the final button, after the human's OK.
// Usage: node driver.js  (listens on 127.0.0.1:7788)
//   POST /cmd {"op":"goto","url":...} | {"op":"fields"} | {"op":"fill","sel":...,"value":...}
//        {"op":"select","sel":...,"value":...} | {"op":"click","sel":...} | {"op":"shot","name":...}
//        {"op":"text"} | {"op":"close"}
const http = require('http');
const { chromium } = require('playwright');
const OUT = __dirname;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  const page = await ctx.newPage();
  const log = (m) => console.log(new Date().toISOString(), m);

  const ops = {
    goto: async ({ url }) => { const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); return { status: r && r.status(), url: page.url(), title: await page.title() }; },
    // Describe every visible form control so Claude can choose selectors without guessing
    fields: async () => page.evaluate(() => [...document.querySelectorAll('input, select, textarea, button, a[role=button]')]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({
        tag: e.tagName.toLowerCase(), type: e.type || '', id: e.id, name: e.name || '',
        label: (e.labels && e.labels[0] && e.labels[0].innerText.trim()) || e.placeholder || e.innerText?.trim().slice(0, 60) || e.value?.slice(0, 40) || '',
        options: e.tagName === 'SELECT' ? [...e.options].slice(0, 60).map((o) => o.text.trim()) : undefined,
      }))),
    fill: async ({ sel, value }) => { await page.fill(sel, value); return { ok: true }; },
    select: async ({ sel, value }) => { const v = await page.selectOption(sel, { label: value }).catch(() => page.selectOption(sel, value)); return { ok: true, v }; },
    click: async ({ sel }) => { await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), page.click(sel)]); await page.waitForTimeout(1500); return { url: page.url(), title: await page.title() }; },
    shot: async ({ name = 'step' }) => { const p = `${OUT}/${name}.png`; await page.screenshot({ path: p, fullPage: true }); return { path: p }; },
    text: async () => (await page.innerText('body')).slice(0, 6000),
    close: async () => { await browser.close(); setTimeout(() => process.exit(0), 100); return { closed: true }; },
  };

  http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const cmd = JSON.parse(body || '{}');
        // Never log values typed into fields (they may be a phone number or OTP)
        log(`op=${cmd.op}${cmd.sel ? ' sel=' + cmd.sel : ''}${cmd.url ? ' url=' + cmd.url : ''}`);
        const out = await ops[cmd.op](cmd);
        res.end(JSON.stringify({ ok: true, out }, null, 1));
      } catch (e) {
        res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
  }).listen(7788, '127.0.0.1', () => log('driver ready on 127.0.0.1:7788'));
})();
