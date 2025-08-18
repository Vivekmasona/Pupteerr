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

    let resolved = false;

    page.on("request", async (reqEvent) => {
      const link = reqEvent.url();

      // ✅ YouTube videoplayback
      if (
        link.includes("videoplayback") &&
        link.includes("expire=") &&
        !resolved
      ) {
        resolved = true;
        await browser.close();
        return res.json({ platform: "youtube", link });
      }

      // ✅ Instagram reels/posts mp4 CDN
      if (
        (link.includes("cdninstagram.com") || link.includes("fbcdn.net")) &&
        (link.endsWith(".mp4") || link.includes(".mp4?")) &&
        !resolved
      ) {
        resolved = true;
        await browser.close();
        return res.json({ platform: "instagram", link });
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // agar 10 sec tak link nahi mila to timeout
    setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        await browser.close();
        res.status(404).json({ error: "Video link not found" });
      }
    }, 10000);

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running http://localhost:${PORT}`)
);
