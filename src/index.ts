import express from "express";
import puppeteer from "puppeteer";

const app  = express();
const PORT = process.env.PORT || 3000;

const SELECTORS_TO_REMOVE = [
  "yt-list-item-view-model",
  ".ytListItemViewModelHost",
  ".fullscreen-action-menu",
  ".action-menu-engagement-buttons-wrapper",
  ".quick-actions-wrapper",
  ".watch-on-youtube-button-wrapper",
  "ytm-fullscreen-related-videos-entry-point-view-model",
  "ytm-slim-metadata-button-renderer",
  "embedded-player-video-details",
  ".ytmVideoInfoHost",
];

app.get("/video", async (req, res) => {
  const videoId = String(req.query.videoId ?? "");

  if (!/^[\w-]{5,20}$/.test(videoId)) {
    return res.status(400).send("Invalid video ID");
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    );

    const embedUrl =
      `https://www.youtube-nocookie.com/embed/${videoId}` +
      `?autoplay=1&mute=1&rel=0&modestbranding=1` +
      `&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`;

    await page.goto(embedUrl, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    // Remove unwanted elements
    await page.evaluate((selectors: string[]) => {
      selectors.forEach(function(sel: string) {
        const elements: any = (globalThis as any).document.querySelectorAll(sel);
        elements.forEach(function(el: any) { el.remove(); });
      });
    }, SELECTORS_TO_REMOVE);

    let html = await page.content();

    // Fix relative URLs — inject <base> tag pointing to YouTube
    // so /s/player/... loads from youtube-nocookie.com not our server
    html = html.replace(
      "<head>",
      `<head><base href="https://www.youtube-nocookie.com/">`
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).send(`Error: ${msg}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));