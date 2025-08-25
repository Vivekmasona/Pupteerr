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

app.get("/liv", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("url param required");

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Response ko stream mode me rakho
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.flushHeaders();

  let seen = new Set();

  page.on("response", async (response) => {
    try {
      const reqUrl = response.url();
      const headers = response.headers();
      const ct = headers["content-type"] || "";

      if (
        ct.startsWith("audio/") ||
        ct.startsWith("video/") ||
        reqUrl.match(/\.(mp4|m4a|mp3|aac|webm|ogg|wav|m3u8|mpd)(\?|$)/i) ||
        reqUrl.includes("videoplayback") ||
        reqUrl.includes("fbcdn") ||
        reqUrl.includes("twimg") ||
        reqUrl.includes("instagram") ||
        reqUrl.includes("vimeocdn") ||
        reqUrl.includes("dailymotion")
      ) {
        if (!seen.has(reqUrl)) {
          seen.add(reqUrl);

          const data = { url: reqUrl, type: ct };
          console.log("Captured:", data); // Server console me live print
          res.write(JSON.stringify(data) + "\n"); // Client pe bhi live print
        }
      }
    } catch {}
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });

  // Response ko kabhi end na karo → live stream chalta rahe
});
 
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
