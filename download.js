/**
 * ASRP — Smart download button
 * Detects user platform and fetches the matching latest release asset from
 * the GitHub Releases API. Falls back gracefully to the releases page.
 */
(function () {
  'use strict';

  var REPO = 'JackZH26/ASRP-JZIS';
  var RELEASES_PAGE = 'https://github.com/' + REPO + '/releases/latest';
  var API_URL = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  var CACHE_KEY = 'asrp_release_cache_v1';
  var CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  function detectPlatform() {
    var ua = (navigator.userAgent || '').toLowerCase();
    var platform = (navigator.platform || '').toLowerCase();
    if (/mac|iphone|ipad|ipod/.test(platform) || /mac os x|macintosh/.test(ua)) {
      // Try to detect Apple Silicon vs Intel — best-effort
      var arm = /arm|aarch64/.test(ua);
      return { os: 'mac', label: 'macOS', arch: arm ? 'arm64' : 'x64' };
    }
    if (/win/.test(platform) || /windows/.test(ua)) {
      return { os: 'win', label: 'Windows', arch: 'x64' };
    }
    if (/linux/.test(platform) || /linux/.test(ua)) {
      return { os: 'linux', label: 'Linux', arch: 'x64' };
    }
    return { os: 'unknown', label: 'Download', arch: 'x64' };
  }

  function pickAsset(assets, plat) {
    if (!assets || !assets.length) return null;
    var rank = function (name) {
      var n = name.toLowerCase();
      if (plat.os === 'mac') {
        if (n.endsWith('.dmg')) {
          if (plat.arch === 'arm64' && /arm64|aarch64/.test(n)) return 100;
          if (plat.arch === 'x64' && /x64|intel|x86_64/.test(n)) return 100;
          return 80;
        }
        if (n.endsWith('.zip') && /mac|darwin/.test(n)) return 60;
      } else if (plat.os === 'win') {
        if (n.endsWith('.exe')) return 100;
        if (n.endsWith('.msi')) return 90;
      } else if (plat.os === 'linux') {
        if (n.endsWith('.appimage')) return 100;
        if (n.endsWith('.deb')) return 90;
        if (n.endsWith('.rpm')) return 85;
        if (n.endsWith('.tar.gz')) return 70;
      }
      return 0;
    };
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < assets.length; i++) {
      var s = rank(assets[i].name || '');
      if (s > bestScore) {
        bestScore = s;
        best = assets[i];
      }
    }
    return bestScore > 0 ? best : null;
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.t || Date.now() - obj.t > CACHE_TTL_MS) return null;
      return obj.data;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {}
  }

  function fetchRelease() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    return fetch(API_URL, { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { writeCache(data); return data; });
  }

  function applyToButton(btn, plat, release, asset) {
    if (!btn) return;
    var labelEl = btn.querySelector('[data-dl-label]');
    var versionEl = btn.querySelector('[data-dl-version]');
    var subEl = btn.querySelector('[data-dl-sub]');

    var verText = release && release.tag_name ? release.tag_name : '';
    if (labelEl) labelEl.textContent = 'Download for ' + plat.label;
    if (versionEl && verText) versionEl.textContent = verText;
    if (subEl) {
      if (asset) {
        subEl.textContent = asset.name;
      } else if (release) {
        subEl.textContent = 'See all platforms';
      }
    }

    var href = (asset && asset.browser_download_url) || (release && release.html_url) || RELEASES_PAGE;
    btn.setAttribute('href', href);
    btn.setAttribute('data-platform', plat.os);
    btn.classList.add('dl-ready');
  }

  function init() {
    var btns = document.querySelectorAll('[data-asrp-download]');
    if (!btns.length) return;
    var plat = detectPlatform();

    // Set immediate fallback
    btns.forEach(function (btn) {
      applyToButton(btn, plat, null, null);
      btn.setAttribute('href', RELEASES_PAGE);
    });

    fetchRelease()
      .then(function (release) {
        var asset = pickAsset(release.assets || [], plat);
        btns.forEach(function (btn) { applyToButton(btn, plat, release, asset); });

        // Fill any standalone version placeholders (e.g. hero badge)
        var verEls = document.querySelectorAll('[data-asrp-version]');
        verEls.forEach(function (el) { el.textContent = release.tag_name || ''; });

        // Also fill any "other platforms" lists
        var others = document.querySelectorAll('[data-asrp-download-list]');
        others.forEach(function (list) {
          list.innerHTML = '';
          var platforms = [
            { os: 'mac', label: 'macOS' },
            { os: 'win', label: 'Windows' },
            { os: 'linux', label: 'Linux' }
          ];
          platforms.forEach(function (p) {
            var a = pickAsset(release.assets || [], { os: p.os, arch: 'x64' });
            if (!a) return;
            var li = document.createElement('a');
            li.href = a.browser_download_url;
            li.className = 'dl-other';
            li.innerHTML = '<span class="dl-other-os">' + p.label + '</span><span class="dl-other-name">' + a.name + '</span>';
            list.appendChild(li);
          });
        });
      })
      .catch(function () {
        // Silent — fallback already in place
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
