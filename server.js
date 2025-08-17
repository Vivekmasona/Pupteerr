import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/ext", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Valid URL required" });

  try {
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    // Load into cheerio (like jQuery)
    const $ = cheerio.load(html);

    // Extract all links
    const links = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href) links.push(href);
    });

    res.json({ url, html, links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
