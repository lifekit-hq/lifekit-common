/**
 * Freezing a settled screen so the design judge can read it. The judge (the impeccable engine) opens
 * a URL in a browser of its own, so it never sees what the app's Playwright page holds: the route
 * mocks, the stored theme, the login. `freezeScreen` therefore serialises the settled DOM, and
 * `serveFrozen` serves that document at the page's own address, passing every other request (the
 * stylesheets, the fonts, the images) through to the app. The judge gets the same DOM, the same
 * styles and the same address, with no script left to change it.
 */
import {createServer} from 'node:http';

import {LOADING_SELECTOR, settleScreen} from './settle.mjs';

/**
 * Runs in the browser: the document as static HTML, shadow roots included (as declarative shadow
 * DOM, with their adopted stylesheets), form state written back into attributes and every script
 * removed. Also reports whether a loading marker is on screen, so a skeleton is never judged.
 *
 * @param {string} loadingSelector
 * @returns {{html: string, loading: boolean}}
 */
export function serializeScreen(loadingSelector) {
  const VOID = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'source',
    'track',
    'wbr',
  ]);
  const RAW = new Set(['style', 'textarea', 'title']);
  const DROPPED = new Set(['script', 'noscript', 'template']);
  const escapeText = text =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttr = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const sheetCss = sheet => {
    try {
      return [...sheet.cssRules].map(rule => rule.cssText).join('\n');
    } catch {
      return '';
    }
  };
  const adopted = root => root.adoptedStyleSheets.map(sheetCss).filter(Boolean);

  const attributesOf = element => {
    const attributes = new Map([...element.attributes].map(({name, value}) => [name, value]));
    const tag = element.localName;
    if (tag === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        if (element.checked) attributes.set('checked', '');
        else attributes.delete('checked');
      } else if (type !== 'file') {
        attributes.set('value', element.value);
      }
    } else if (tag === 'option') {
      if (element.selected) attributes.set('selected', '');
      else attributes.delete('selected');
    } else if (tag === 'iframe') {
      // A nested document is not frozen: it would load live, so it is left out.
      attributes.delete('src');
      attributes.delete('srcdoc');
    }
    return [...attributes].map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('');
  };

  const serializeChildren = (parent, out) => {
    for (const child of parent.childNodes) serialize(child, out);
  };

  const serialize = (node, out) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(RAW.has(node.parentNode?.localName) ? node.data : escapeText(node.data));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.localName;
    if (DROPPED.has(tag)) return;
    if (tag === 'link' && /\b(modulepreload|preload|prefetch)\b/.test(node.rel)) return;
    out.push(`<${tag}${attributesOf(node)}>`);
    if (VOID.has(tag)) return;
    if (node.shadowRoot) {
      out.push('<template shadowrootmode="open">');
      for (const css of adopted(node.shadowRoot)) out.push(`<style>${css}</style>`);
      serializeChildren(node.shadowRoot, out);
      out.push('</template>');
    }
    if (tag === 'textarea') out.push(node.value);
    else serializeChildren(node, out);
    // Constructed stylesheets come after the document's own, as they do in the cascade.
    if (tag === 'head') for (const css of adopted(document)) out.push(`<style>${css}</style>`);
    out.push(`</${tag}>`);
  };

  const out = [];
  const doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>` : '<!DOCTYPE html>';
  serialize(document.documentElement, out);

  const loading = [...document.querySelectorAll(loadingSelector)].some(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  return {html: doctype + out.join(''), loading};
}

/**
 * Settles the screen and freezes it. A frozen document that still shows a loading marker is
 * discarded and the screen settled again, until `timeout` passes: a skeleton is retried, never
 * accepted.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 * @param {{timeout?: number, retryMs?: number, now?: () => number}} [options]
 * @returns {Promise<string>} the frozen document
 */
export async function freezeScreen(page, {timeout = 30_000, retryMs = 250, now = Date.now} = {}) {
  const deadline = now() + timeout;
  for (;;) {
    const remaining = Math.max(deadline - now(), 1);
    await settleScreen(page, {timeout: remaining});
    const {html, loading} = await page.evaluate(serializeScreen, LOADING_SELECTOR);
    if (!loading) return html;
    if (now() >= deadline) {
      throw new Error(`${page.url()} never settled: the frozen screen still shows a skeleton`);
    }
    await new Promise(resolve => setTimeout(resolve, retryMs));
  }
}

/**
 * Serves `html` at `pageUrl`'s path and passes every other request to the page's origin. Returns the
 * address of the frozen document and a function that stops the server.
 *
 * @param {string} html
 * @param {string} pageUrl
 * @param {{fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
export async function serveFrozen(html, pageUrl, {fetchImpl = fetch} = {}) {
  const origin = new URL(pageUrl).origin;
  const target = new URL(pageUrl);
  const documentPath = target.pathname + target.search;
  // Absolute links to the app's own origin follow the document to this server.
  const body = html.replaceAll(`${origin}/`, '/');

  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    if (request.url === documentPath) {
      response.writeHead(200, {'content-type': 'text/html; charset=utf-8'}).end(body);
      return;
    }
    try {
      const upstream = await fetchImpl(origin + request.url, {
        headers: {'accept-encoding': 'identity'},
      });
      const headers = {};
      const type = upstream.headers.get('content-type');
      if (type) headers['content-type'] = type;
      response.writeHead(upstream.status, headers);
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      response.writeHead(502).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const {port} = server.address();
  return {
    url: `http://127.0.0.1:${port}${documentPath}`,
    close: () => new Promise(resolve => server.close(() => resolve())),
  };
}
