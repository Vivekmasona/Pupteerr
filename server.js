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

      // ✅ YouTube audio only (itag 140 = m4a, 251 = opus)
      if (
        link.includes("videoplayback") &&
        link.includes("expire=") &&
        (link.includes("itag=140") || link.includes("itag=251"))
      ) {
        if (!links.includes(link)) links.push(link);
      }

      // ✅ Agar 2 audio links mil gaye to turant return
      if (links.length >= 2 && !resolved) {
        resolved = true;
        await browser.close();
        return res.json({ platform: "youtube", audioLinks: links });
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Timeout: agar 10s tak audio link na mile
    setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        await browser.close();
        if (links.length > 0) {
          res.json({ platform: "youtube", audioLinks: links });
        } else {
          res.status(404).json({ error: "Audio link not found" });
        }
      }
    }, 10000);
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
