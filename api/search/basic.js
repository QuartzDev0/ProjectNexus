// Nexus Search - Basic
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

async function search(url, engine) {
  if (!url.includes("http://") && !url.includes("https://")) {
    // now we check if a mistake was made in the URL. 
    if (/\.[a-z]{2,}$/i.test(url)) {
      // if so, we return this as an actual URL.
      url = "https://" + url;
    } else {
      // if not, we assume it's a search query and detect the wanted 
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
      return {"status": response.status, "body": await response.text()}
    } else {
      return {"status": response.status, "error": response.statusText}
    }
  }
}

module.exports = { basic: search };