let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

async function loadTauriInvoke() {
  try {
    const mod = await import('@tauri-apps/api/core');
    tauriInvoke = mod.invoke;
    console.log('[Tauri Proxy] Tauri API loaded from @tauri-apps/api/core');
    return true;
  } catch {
    console.log('[Tauri Proxy] @tauri-apps/api/core not available, using standard fetch');
    return false;
  }
}

function parseResponseBody(body: any, contentType: string): Promise<any> {
  if (contentType.includes('application/json')) {
    return Promise.resolve(body);
  }
  return Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body));
}

export async function setupTauriHttpProxy() {
  const isTauri = await loadTauriInvoke();
  if (!isTauri || !tauriInvoke) {
    return;
  }

  const invoke = tauriInvoke;
  console.log('[Tauri Proxy] Setting up Tauri HTTP proxy (bypasses CORS)');

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: string;
    let method = 'GET';
    let headers: Record<string, string> = {};
    let body: string | undefined;

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
      method = input.method || 'GET';
      if (input.headers) {
        new Headers(input.headers).forEach((v, k) => { headers[k] = v; });
      }
      if (input.body) {
        body = typeof input.body === 'string' ? input.body : await new Response(input.body).text();
      }
    }

    if (init) {
      method = init.method || method;
      if (init.headers) {
        new Headers(init.headers).forEach((v, k) => { headers[k] = v; });
      }
      if (init.body) {
        body = typeof init.body === 'string' ? init.body : await new Response(init.body).text();
      }
    }

    try {
      console.log('[Tauri Proxy] Sending request:', method, url);
      const result = await invoke('http_request', {
        method,
        url,
        headers,
        body: body || null,
      }) as any;

      const contentType = result.headers?.['content-type'] || 'application/json';
      const status = result.status || 200;

      const responseBody = await parseResponseBody(result.body, contentType);
      const blob = new Blob(
        [typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)],
        { type: contentType }
      );

      return new Response(blob, {
        status,
        statusText: result.status_text || '',
        headers: result.headers || {},
      });
    } catch (err: any) {
      console.error('[Tauri Proxy] Request failed:', url, err);
      throw new TypeError(`Failed to fetch: ${err}`);
    }
  };
}
