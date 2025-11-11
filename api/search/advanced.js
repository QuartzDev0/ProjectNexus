// Nexus Search - Advanced
// ─────────────────────────────

const DEFAULT_HEADERS = {
  "Host": "www.google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1"
}

const VALID_ENGINES = {
  "GOOGLE": "https://google.com/",
  "BING": "https://bing.com/",
  "DUCKDUCKGO": "https://duckduckgo.com/",
  "YAHOO": "https://yahoo.com/",
  "BAIDU": "https://baidu.com/",
  "YANDEX": "https://yandex.com/",
  "QWANT": "https://qwant.com/",
  "ASK": "https://ask.com/"
}

// Common ad and tracking domains to block (including video ad servers)
const BLOCKED_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'facebook.com/tr',
  'connect.facebook.net', 'scorecardresearch.com', 'amazon-adsystem.com',
  'adnxs.com', 'adsrvr.org', 'advertising.com', 'pixel.mathtag.com',
  'analytics.twitter.com', 'ads-twitter.com', 'hotjar.com', 'mouseflow.com',
  // Video ad servers
  'imasdk.googleapis.com', 'pubads.g.doubleclick.net', 'video-ad-stats.googlesyndication.com',
  'pagead2.googlesyndication.com', 's.ytimg.com/yts/jsbin', 'static.doubleclick.net',
  'vast.yume.com', 'ads.youtube.com', 'adserver.pandora.com', 'adservice.google.com',
  'innovid.com', 'fwmrm.net', 'spotxchange.com', 'advertising.apple.com'
];

// Ad-related HTML patterns to remove (including video ads)
const AD_PATTERNS = [
  /<script[^>]*google-analytics[^>]*>.*?<\/script>/gis,
  /<script[^>]*googletagmanager[^>]*>.*?<\/script>/gis,
  /<script[^>]*doubleclick[^>]*>.*?<\/script>/gis,
  /<iframe[^>]*googlesyndication[^>]*>.*?<\/iframe>/gis,
  /<ins[^>]*adsbygoogle[^>]*>.*?<\/ins>/gis,
  /<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?<\/div>/gis,
  /<div[^>]*id="[^"]*ad[^"]*"[^>]*>.*?<\/div>/gis,
  /<!-- Google Analytics.*?-->/gis,
  /<!-- Facebook Pixel.*?-->/gis,
  // Video ad patterns
  /<script[^>]*imasdk[^>]*>.*?<\/script>/gis,
  /<script[^>]*pubads[^>]*>.*?<\/script>/gis,
  /<video[^>]*preroll[^>]*>.*?<\/video>/gis,
  /<div[^>]*video-ads[^>]*>.*?<\/div>/gis,
  /yt\.setConfig\(['"]PLAYER_VARS['"][^}]*ads[^}]*\}/gis,
  /adSlots.*?\]/gis,
  /playerAds.*?\}/gis
];

// Remove ads and tracking scripts from HTML
function sanitizeHTML(html) {
  let cleaned = html;

  // Remove ad patterns
  AD_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove inline event handlers that might be used for tracking
  cleaned = cleaned.replace(/on\w+="[^"]*"/gi, '');

  // Remove tracking pixels (1x1 images)
  cleaned = cleaned.replace(/<img[^>]*width="1"[^>]*height="1"[^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*height="1"[^>]*width="1"[^>]*>/gi, '');

  // Block video ad initialization scripts
  cleaned = cleaned.replace(/\.requestAds\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/initializeAdDisplayContainer\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/vastLoadTimeout.*?}/gi, '');

  // Remove VAST/VPAID ad tags
  cleaned = cleaned.replace(/<VAST[^>]*>.*?<\/VAST>/gis, '');
  cleaned = cleaned.replace(/<vmap[^>]*>.*?<\/vmap>/gis, '');

  return cleaned;
}

async function search(url, engine) {
  if (!url.includes("http://") && !url.includes("https://")) {
    // now we check if a mistake was made in the URL. 
    if (/\.[a-z]{2,}$/i.test(url)) {
      // if so, we return this as an actual URL.
      url = "https://" + url;
    } else {
      // if not, we assume it's a search query and detect the wanted engine
      for (const validEngine in VALID_ENGINES) {
        // if the engine is valid, we change the url to a search url based on the wanted engine.
        if (engine == validEngine || engine.includes(validEngine.toLowerCase())) {
          url = VALID_ENGINES[validEngine] + "search?q=" + url;
          break;
        }
      }
    }

    // now we get the request ready to return to the user.
    const response = await fetch(url, { headers: DEFAULT_HEADERS })
    if (response.ok) {
      const html = await response.text();
      const sanitized = sanitizeHTML(html);
      return {"status": response.status, "body": sanitized}
    } else {
      return {"status": response.status, "error": response.statusText}
    }
  }
}

module.exports = { advanced: search };