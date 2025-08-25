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

// ---------- FRONTEND PAGE ----------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Live Media Sniffer</title>
  <style>
    body { font-family: monospace; background:#111; color:#0f0; padding:20px; }
    #log { white-space: pre-wrap; }
    input { padding:5px; width:60%; }
    button { padding:6px; }
  </style>
</head>
<body>
  <h2>🎵 Live Media URL Sniffer</h2>
  <form id="form">
    <input type="text" id="url" placeholder="Enter any page URL (YouTube, Insta, FB...)" required>
    <button type="submit">Start Sniffing</button>
  </form>
  <hr>
  <div id="log"></div>

  <script>
    const form = document.getElementById("form");
    const log = document.getElementById("log");

    form.addEventListener("submit", e => {
      e.preventDefault();
      log.innerHTML = "Sniffing started...<br>";

      const url = document.getElementById("url").value;
      const evtSrc = new EventSource("/live?url=" + encodeURIComponent(url));

      evtSrc.onmessage = function(event) {
        const data = JSON.parse(event.data);
        log.innerHTML += data.url + "\\n";
      };
    });
  </script>
</body>
</html>
  `);
});

// ---------- BACKEND LIVE SCRAPER ----------
app.get("/live", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("url param required");

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
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
        reqUrl.match(/\.(mp4|m4a|mp3|aac|webm|ogg|wav|m3u8|mpd)(\\?|$)/i) ||
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
          console.log("Captured:", data); // server console
          res.write("data: " + JSON.stringify(data) + "\\n\\n"); // frontend
        }
      }
    } catch {}
  });

  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 0 });

  // Response kabhi end nahi karna → stream chalta rahega
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
