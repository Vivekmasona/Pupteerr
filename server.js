import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

let browserPromise;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  return browserPromise;
}

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "url param required" });

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Set User-Agent like real browser (important for insta/fb/twitter)
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    let mediaUrls = [];

    page.on("response", async (response) => {
      try {
        const reqUrl = response.url();
        const headers = response.headers();
        const ct = headers["content-type"] || "";

        // Filter: only audio/video/CDN urls
        if (
          ct.startsWith("audio/") ||
          ct.startsWith("video/") ||
          reqUrl.match(/\.(mp4|m4a|mp3|aac|webm|ogg|wav|m3u8|mpd)(\?|$)/i) ||
          reqUrl.includes("videoplayback") || // YouTube
          reqUrl.includes("fbcdn") || // Facebook CDN
          reqUrl.includes("twimg") || // Twitter/X
          reqUrl.includes("instagram") || // Insta blob/cdn
          reqUrl.includes("vimeocdn") || // Vimeo
          reqUrl.includes("dailymotion") // Dailymotion
        ) {
          mediaUrls.push({
            url: reqUrl,
            type: ct || response.request().resourceType(),
            status: response.status(),
          });
        }
      } catch (err) {
        // ignore errors
      }
    });

    // goto + wait
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForTimeout(15000); // extra wait for media reqs

    await page.close();

    // unique urls only
    mediaUrls = [...new Map(mediaUrls.map((m) => [m.url, m])).values()];

    res.json({
      page: url,
      count: mediaUrls.length,
      media: mediaUrls,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
