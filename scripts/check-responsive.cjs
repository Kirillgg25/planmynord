const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/redco/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const app = express();
  app.use(express.static(path.join(__dirname, '../public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const pages = fs.readdirSync(path.join(__dirname, '../public')).filter(f => f.endsWith('.html'));
    const results = [];
    for (const file of pages) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript((language) => {
        localStorage.setItem('tripplannerLanguage', language);
        localStorage.setItem('planmynordAnalyticsConsent', 'denied');
      }, process.argv[2] || 'ru');
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        const user = {id:'test',name:'Test User',email:'test@example.com',role:'admin',emailVerified:true,vpnPreview:true,vip:{active:false}};
        const data = {user:file === 'account.html' ? null : user, users:[user], trips:[],tickets:[],routes:[],payments:[],devices:[],google:{enabled:false}, subscription:{plan:'free',deviceLimit:5,status:'active'},product:{},ratings:{}};
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
      });
      for (const width of [320,390,768,1280,1920,3440,5120]) {
        await page.setViewportSize({width,height:width < 800 ? 900 : 1080});
        await page.goto(`http://127.0.0.1:${server.address().port}/${file}`, {waitUntil:'load'});
        await page.waitForTimeout(150);
        const result = await page.evaluate(() => {
          const footer = document.querySelector('.legal-footer');
          const main = document.querySelector('main');
          const offenders = [...document.querySelectorAll('body *')].filter(e => {
            const r = e.getBoundingClientRect();
            return r.width && r.height && (r.right > innerWidth + 2 || r.left < -2) && getComputedStyle(e).position !== 'fixed' && !e.closest('[hidden], .admin-table-wrap');
          }).slice(0,8).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '.' + String(e.className).split(' ').join('.')));
          return {overflow:document.documentElement.scrollWidth > innerWidth+2, offenders,
            footerGap:footer ? Math.round(innerHeight-footer.getBoundingClientRect().bottom) : null,
            mainWidth:main ? Math.round(main.getBoundingClientRect().width) : null};
        });
        results.push({file,width,...result,errors:[...new Set(errors)]});
        if ((file === 'profile.html' && [390,1920].includes(width)) || (file === 'routes.html' && width === 320)) {
          await page.screenshot({path:path.join(require('node:os').tmpdir(),`responsive-${file}-${width}.png`)});
        }
      }
      await page.close();
    }
    const output = path.join(require('node:os').tmpdir(),'planmynord-responsive.json');
    fs.writeFileSync(output,JSON.stringify(results,null,2));
    console.log('Tested',results.length,'page/viewport combinations. Report:',output);
    console.log(JSON.stringify(results.filter(r=>r.overflow || r.footerGap > 2 || r.errors.length),null,2));
  } finally {if(browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
