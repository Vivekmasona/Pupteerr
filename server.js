import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 Target site set karo
const TARGET_URL = "https://www.jiosaavn.com/";

let browserPromise;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      userDataDir: "/tmp/chrome-user-data",
    });
  }
  return browserPromise;
}

// Step 1: Capture how search works
app.get("/inspect", async (req, res) => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    let apiCalls = [];

    page.on("request", (reqEvent) => {
      const url = reqEvent.url();
      if (url.includes("search") || url.includes("api")) {
        apiCalls.push({ method: reqEvent.method(), url });
      }
    });

    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait a bit so site JS loads
    await page.waitForTimeout(5000);

    await page.close();
    res.json({ apiCalls });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Proxy actual search
app.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query required" });

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    let results = [];

    page.on("response", async (response) => {
      try {
        const reqUrl = response.url();
        if (reqUrl.includes("search") || reqUrl.includes("api")) {
          const data = await response.json().catch(() => null);
          if (data) results.push(data);
        }
      } catch (e) {}
    });

    await page.goto(`${TARGET_URL}`, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Target site pe search box fill + submit
    await page.type("input[type='text']", q);
    await page.keyboard.press("Enter");

    await page.waitForTimeout(5000);

    await page.close();

    if (results.length > 0) {
      res.json({ query: q, results });
    } else {
      res.status(404).json({ error: "No results captured" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
