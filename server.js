import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/extract", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Valid URL is required" });
  }

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      timeout: 0 // unlimited
    });

    const page = await browser.newPage();

    // Navigation with bigger timeout
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000, // 60 seconds
    });

    // extra wait for JS-rendered content
    await page.waitForTimeout(5000);

    // Ensure buttons exist
    const link720 = await page.$eval("#720dl", el => el.href).catch(() => null);
    const link360 = await page.$eval("#360dl", el => el.href).catch(() => null);

    await browser.close();

    res.json({
      url,
      links: {
        "720p": link720,
        "360p": link360,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
