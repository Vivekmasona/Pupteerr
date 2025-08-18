import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/extract", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Valid URL required" });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const collected = [];

    page.on("requestfinished", async (req) => {
      try {
        const response = await req.response();
        if (response && response.url().includes("videoplayback?expire=")) {
          collected.push(response.url());
        }
      } catch (err) {}
    });

    // Navigate to page
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Race between 30 sec timeout and network collection
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 30000)), // 30s max
      new Promise(async (resolve) => {
        // agar page idle ho jaye to resolve
        await page.waitForNetworkIdle({ timeout: 30000 }).catch(() => {});
        resolve();
      }),
    ]);

    await browser.close();

    if (collected.length === 0) {
      return res.status(404).json({ error: "No videoplayback URL found" });
    }

    res.json({ urls: collected });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
