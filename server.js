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

    let links = [];

    page.on("request", async (reqEvent) => {
      let link = reqEvent.url();

      // ✅ YouTube videoplayback
      if (link.includes("videoplayback") && link.includes("expire=")) {
        links.push({ platform: "youtube", link });
      }

      // ✅ Instagram CDN video/audio
      if (
        (link.includes("cdninstagram.com") || link.includes("fbcdn.net")) &&
        (link.includes(".mp4") || link.includes(".m4a"))
      ) {
        // clean query (remove bytestart / byteend)
        link = link.replace(/&bytestart=\d+&byteend=\d+/g, "");
        links.push({ platform: "instagram", link });
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait 5s to collect all media requests
    setTimeout(async () => {
      await browser.close();
      if (links.length > 0) {
        res.json({ success: true, links });
      } else {
        res.status(404).json({ error: "No video/audio links found" });
      }
    }, 5000);

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running http://localhost:${PORT}`)
);
