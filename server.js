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
    // Puppeteer launch config (Render/Vercel compatible)
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    const links = [];

    // Intercept network requests
    page.on("response", async (response) => {
      try {
        const requestUrl = response.url();
        if (requestUrl.includes("videoplayback?expire=")) {
          links.push(requestUrl);
        }
      } catch {}
    });

    // Navigate
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait a bit for extra requests
    await page.waitForTimeout(10000);

    await browser.close();

    if (links.length === 0) {
      return res.status(404).json({ error: "No playback links found" });
    }

    res.json({ playbackLinks: links });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
