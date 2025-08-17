import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

// API: Extract video download links
app.get("/extract", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Valid URL is required" });
  }

  try {
    // Launch browser in serverless-friendly mode
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for download buttons
    await page.waitForSelector("#720dl", { timeout: 10000 });
    await page.waitForSelector("#360dl", { timeout: 10000 });

    // Extract links
    const link720 = await page.$eval("#720dl", el => el.href);
    const link360 = await page.$eval("#360dl", el => el.href);

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
