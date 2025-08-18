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
    const links = new Set(); // avoid duplicates

    // Intercept all network requests
    page.on("response", async (response) => {
      try {
        const requestUrl = response.url();

        // Filter only CDN/media type links
        if (
          requestUrl.includes("videoplayback") ||
          requestUrl.includes(".m3u8") ||
          requestUrl.includes(".mpd") ||
          requestUrl.includes(".mp4") ||
          requestUrl.includes(".ts") ||
          requestUrl.includes("cdn") ||
          requestUrl.includes("media")
        ) {
          links.add(requestUrl);
        }
      } catch {}
    });

    // Navigate (30 sec max)
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Capture for 20s extra
    await page.waitForTimeout(20000);

    await browser.close();

    if (links.size === 0) {
      return res.status(404).json({ error: "No CDN/media links found" });
    }

    res.json({ cdnLinks: Array.from(links) });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
