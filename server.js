import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/extract", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Valid URL required" });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000, // 60s
    });

    // thoda wait JS load hone ka
    await new Promise(r => setTimeout(r, 8000));

    // full page html lelo
    const html = await page.content();

    // regex se sirf googlevideo.com links nikaal lo
    const matches = [...html.matchAll(/https:\/\/redirector\.googlevideo\.com\/videoplayback\?[^"]+/g)];
    const videoLinks = matches.map(m => m[0]);

    await browser.close();

    res.json({
      url,
      count: videoLinks.length,
      videoLinks
    });

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running http://localhost:${PORT}`));
