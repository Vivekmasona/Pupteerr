import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Normalize short links (youtu.be → youtube.com/watch?v=)
function normalizeUrl(url) {
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/watch?v=${id}`;
  }
  return url;
}

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

    // ✅ Har network request capture karo
    page.on("request", (reqEvent) => {
      const link = reqEvent.url();
      if (!links.includes(link)) {
        links.push(link);
      }
    });

    // 🔹 Normalize (short links support)
    let finalUrl = normalizeUrl(url);

    await page.goto(finalUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // ⏳ 8s wait → sab collected links bhej do
    setTimeout(async () => {
      await browser.close();
      if (links.length > 0) {
        res.json({ total: links.length, links });
      } else {
        res.status(404).json({ error: "No network requests captured" });
      }
    }, 8000);
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
