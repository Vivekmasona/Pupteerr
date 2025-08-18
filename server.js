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
    let links = [];

    page.on("request", async (reqEvent) => {
      let link = reqEvent.url();

      // âœ… YouTube videoplayback
      if (link.includes("videoplayback") && link.includes("expire=")) {
        if (!links.includes(link)) links.push(link);
      }

      // âœ… Instagram reels/posts mp4 CDN
      if (
        (link.includes("cdninstagram.com") || link.includes("fbcdn.net")) &&
        link.includes(".mp4")
      ) {
        link = link.replace(/&bytestart=\d+&byteend=\d+/g, "");
        if (!links.includes(link)) links.push(link);
      }

      // âœ… Agar 4 ho gaye to close aur return
      if (links.length >= 4 && !resolved) {
        resolved = true;
        await browser.close();
        return res.json({ links: links.slice(0, 4) });
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Timeout: agar 10s tak 4 link na mile to jo bhi mila bhej do
    setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        await browser.close();
        if (links.length > 0) {
          res.json({ links: links.slice(0, 4) });
        } else {
          res.status(404).json({ error: "Video link not found" });
        }
      }
    }, 10000);
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`âœ… Server running http://localhost:${PORT}`)
);
