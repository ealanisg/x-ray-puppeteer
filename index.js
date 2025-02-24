const debug = require('debug')('x-ray:puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

puppeteer.use(StealthPlugin());
process.setMaxListeners(Infinity); // avoid issue https://github.com/puppeteer/puppeteer/issues/594

function makeDriver(opts) {
  opts = opts || {};
  if (!opts.waitForTimeout) opts.waitForTimeout = 5000;
  if (!opts.useragent) opts.useragent = 'x-ray/puppeteer';

  return (ctx, callback) => {
    debug('going to %s', ctx.url);
    this.instance = puppeteer;

    const autoScroll = async (page) => {
      await page.waitForTimeout(opts.waitForTimeout);
      await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
          let totalHeight = 0;
          const distance = 100;
          let timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
    };

    puppeteer
      .launch({
        ignoreHTTPSErrors: true,
        headless: true
      })
      .then(async (browser) => {
        const page = await browser.newPage();
        try {
          await page.setUserAgent(opts.useragent);
          await page.goto(ctx.url, {
            timeout: 120000,
            waitUntil: 'load'
          });
          await page.setViewport({
            width: 1200,
            height: 800
          });
          await autoScroll(page);
          const html = await page.evaluate(() => document.documentElement.outerHTML);
          return html;
        } catch (e) {
          throw e;
        } finally {
          await browser.close();
        }
      })
      .then((body) => {
        ctx.body = body;
        debug('%s - %s', ctx.url, ctx.status);
        return callback(null, ctx);
      })
      .catch((e) => {
        console.error(e)
        return callback(e);
      })
  };
}

module.exports = makeDriver;
