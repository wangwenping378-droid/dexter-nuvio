/*
 * Experimental Nuvio provider for dexter.pw
 *
 * It only returns direct MP4/HLS media URLs that are present in public page
 * markup. It does not bypass DRM, login gates, encryption, or access controls.
 *
 * Nuvio Provider API: getStreams(tmdbId, mediaType, season, episode)
 */
function getStreams(tmdbId, mediaType, season, episode) {
  var root = "https://dexter.pw";
  var type = mediaType === "tv" ? "tv" : "movie";

  function fetchText(url) {
    return fetch(url, {
      method: "GET",
      headers: { "Accept": "text/html,application/xhtml+xml" }
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.text();
    });
  }

  function unique(values) {
    var out = [];
    values.forEach(function (v) {
      if (v && out.indexOf(v) === -1) out.push(v);
    });
    return out;
  }

  function absolute(url) {
    if (!url) return "";
    url = url.replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return root + url;
    return url;
  }

  function findWatchUrls(html) {
    var urls = [];
    var re = /(?:href|src)\s*=\s*["']([^"']*(?:\/watch\/|\.m3u8(?:\?|$)|\.mp4(?:\?|$))[^"']*)["']/ig;
    var m;
    while ((m = re.exec(html)) !== null) {
      var u = absolute(m[1]);
      if (u.indexOf(root) === 0) urls.push(u);
    }
    return unique(urls);
  }

  function findDirectStreams(html) {
    var urls = [];
    var patterns = [
      /https?:\/\/[^"'\\\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\\\s<>]*)?/ig,
      /https?:\\\\\/\\\\\/[^"'\\\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\\\s<>]*)?/ig
    ];
    patterns.forEach(function (re) {
      var m;
      while ((m = re.exec(html)) !== null) {
        var u = absolute(m[0]);
        if (/^https?:\/\//i.test(u) && /\.(m3u8|mp4)(?:\?|$)/i.test(u)) urls.push(u);
      }
    });
    return unique(urls);
  }

  // Dexter pages appear to use TMDB IDs in URLs, e.g. /movie/299534-avengers-endgame.
  // Try the movie/TV route and follow the page's own watch link if present.
  var detailUrl = root + "/" + type + "/" + encodeURIComponent(String(tmdbId));

  function tryHomepageLookup() {
    return fetchText(root + "/").then(function (home) {
      var anchors = [];
      var re = /href\s*=\s*["']([^"']*(?:\/movie\/|\/tv\/)[^"']*)["']/ig;
      var m;
      while ((m = re.exec(home)) !== null) {
        var href = absolute(m[1]);
        if (href.indexOf("/" + type + "/" + String(tmdbId) + "-") !== -1) anchors.push(href);
      }
      var candidates = unique(anchors);
      if (!candidates.length) return [];
      return fetchText(candidates[0]).then(function (detail) {
        var direct = findDirectStreams(detail);
        if (direct.length) return direct.map(function (url, i) {
          return { name: "Dexter", title: "Direct stream " + (i + 1), url: url, quality: "Unknown", headers: { "Referer": candidates[0] } };
        });
        var watches = findWatchUrls(detail).filter(function (u) { return u.indexOf("/watch/") !== -1; });
        if (!watches.length) return [];
        return fetchText(watches[0]).then(function (watchHtml) {
          return findDirectStreams(watchHtml).map(function (url, i) {
            return { name: "Dexter", title: "Direct stream " + (i + 1), url: url, quality: "Unknown", headers: { "Referer": watches[0] } };
          });
        });
      });
    });
  }

  return fetchText(detailUrl).catch(function () {
    return tryHomepageLookup().then(function (streams) {
      // Wrap the result so the main path can keep a consistent return type.
      return { __fallbackStreams: streams };
    });
  }).then(function (html) {
    if (html && html.__fallbackStreams) return html.__fallbackStreams;
    var direct = findDirectStreams(html);
    if (direct.length) return direct.map(function (url, i) {
      return {
        name: "Dexter",
        title: "Direct stream " + (i + 1),
        url: url,
        quality: "Unknown",
        headers: { "Referer": root + "/" }
      };
    });

    var watchUrls = findWatchUrls(html).filter(function (u) {
      return u.indexOf("/watch/") !== -1;
    });

    return fetchText(watchUrls[0]).then(function (watchHtml) {
      return findDirectStreams(watchHtml).map(function (url, i) {
        return {
          name: "Dexter",
          title: "Direct stream " + (i + 1),
          url: url,
          quality: "Unknown",
          headers: { "Referer": watchUrls[0] }
        };
      });
    });
  }).catch(function (err) {
    console.log("[Dexter] Could not resolve direct media stream:", String(err));
    return [];
  });
}

module.exports = { getStreams: getStreams };
