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
    let playbackUrl: string | null = null;    
    
    // Network response listener    
    page.on("response", response => {    
      const reqUrl = response.url();    
      if (!playbackUrl && reqUrl.includes("videoplayback")) {    
        playbackUrl = reqUrl;    
      }    
    });    
    
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });    
    
    // Thoda wait, network requests capture karne ke liye    
    await page.waitForTimeout(5000);    
    
    await browser.close();    
    
    if (!playbackUrl) return res.status(404).json({ error: "Playback URL not found" });    
    
    res.json({ playbackUrl });    
    
  } catch (err) {    
    if (browser) await browser.close();    
    res.status(500).json({ error: err.message });    
  }    
});    
    
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));    
    
