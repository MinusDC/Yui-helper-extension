import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const CHROME_PATH = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const extensionPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

test('selection trigger opens the assistant only on click and survives scroll', {
  timeout: 45000,
  skip: !existsSync(CHROME_PATH)
}, async () => {
  const fixture = await startFixtureServer();
  const profilePath = await mkdtemp(path.join(os.tmpdir(), 'jl-extension-test-'));
  const debugPort = 43000 + Math.floor(Math.random() * 1000);
  const chrome = spawn(CHROME_PATH, [
    '--enable-automation',
    '--enable-unsafe-extension-debugging',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profilePath}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync'
  ], { stdio: 'ignore', windowsHide: true });

  let browserClient;
  let pageClient;
  try {
    const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    browserClient = await CdpClient.connect(version.webSocketDebuggerUrl);
    await browserClient.send('Extensions.loadUnpacked', { path: extensionPath });
    await wait(300);
    const pageUrl = `${fixture.url}/`;
    const { targetId } = await browserClient.send('Target.createTarget', { url: pageUrl });
    const target = await waitForTarget(debugPort, targetId);
    pageClient = await CdpClient.connect(target.webSocketDebuggerUrl);

    await selectElement(pageClient, 'japanese-a');
    await wait(320);
    const initialUiState = await readUiState(pageClient);
    assert.deepEqual(initialUiState, { triggerVisible: true, popupVisible: false, triggerCount: 1, popupCount: 1 });

    await clickHost(pageClient, '#jl-selection-trigger-host');
    await wait(80);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'trigger click opens popup');

    await evaluate(pageClient, 'window.scrollTo(0, 600)');
    await wait(80);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'scroll keeps popup open');

    await evaluate(pageClient, 'window.scrollTo(0, 0)');
    await wait(80);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'scroll up keeps popup open');

    await pageClient.send('Emulation.setDeviceMetricsOverride', {
      width: 700,
      height: 500,
      deviceScaleFactor: 1,
      mobile: false
    });
    await wait(80);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'resize keeps popup open');
    await pageClient.send('Emulation.clearDeviceMetricsOverride');

    await clickHost(pageClient, '#jl-selection-trigger-host');
    await wait(60);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'trigger click does not close an open popup');

    await clickHost(pageClient, '#jl-selection-host');
    await wait(60);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'click inside popup keeps it open');

    await sendCopyShortcut(pageClient);
    await wait(60);
    assert.equal((await readUiState(pageClient)).popupVisible, true, 'copy shortcut keeps popup open');

    await selectElement(pageClient, 'japanese-b');
    await wait(320);
    assert.deepEqual(await readUiState(pageClient), { triggerVisible: true, popupVisible: true, triggerCount: 1, popupCount: 1 });

    await selectElement(pageClient, 'english');
    await wait(320);
    assert.deepEqual(await readUiState(pageClient), { triggerVisible: false, popupVisible: false, triggerCount: 1, popupCount: 1 });

    await selectElement(pageClient, 'hiragana');
    await wait(320);
    assert.deepEqual(await readUiState(pageClient), { triggerVisible: true, popupVisible: false, triggerCount: 1, popupCount: 1 });

    await clickAt(pageClient, 10, 10);
    await wait(60);
    assert.equal((await readUiState(pageClient)).triggerVisible, false, 'outside click closes trigger/popup UI');
  } finally {
    pageClient?.close();
    browserClient?.close();
    await stopChrome(chrome);
    await fixture.close();
    await removeTemporaryProfile(profilePath);
  }
});

async function startFixtureServer() {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html>
      <html><body style="height:1800px;font:20px sans-serif;padding:120px">
        <p id="japanese-a">日本語を勉強しています。</p>
        <p style="margin-top:500px" id="japanese-b">私はPythonを勉強しています。</p>
        <p id="english">Hello world</p>
        <p id="hiragana">こんにちは</p>
      </body></html>`);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

async function selectElement(client, id) {
  await evaluate(client, `(() => {
    const element = document.getElementById('${id}');
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  })()`);
}

async function readUiState(client) {
  return evaluate(client, `(() => {
    const trigger = document.querySelector('#jl-selection-trigger-host');
    const popup = document.querySelector('#jl-selection-host');
    return {
      triggerVisible: Boolean(trigger && !trigger.hidden),
      popupVisible: Boolean(popup && !popup.hidden),
      triggerCount: document.querySelectorAll('#jl-selection-trigger-host').length,
      popupCount: document.querySelectorAll('#jl-selection-host').length
    };
  })()`);
}

async function clickHost(client, selector) {
  const rect = await evaluate(client, `(() => {
    const element = document.querySelector('${selector}');
    const box = element.getBoundingClientRect();
    return { x: box.left + Math.min(12, box.width / 2), y: box.top + Math.min(12, box.height / 2) };
  })()`);
  await clickAt(client, rect.x, rect.y);
}

async function clickAt(client, x, y) {
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function sendCopyShortcut(client) {
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, modifiers: 2 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, modifiers: 2 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17 });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitForTarget(port, targetId) {
  return waitFor(async () => {
    const targets = await readJson(`http://127.0.0.1:${port}/json/list`);
    return targets.find((target) => target.id === targetId);
  });
}

async function waitForJson(url) {
  return waitFor(() => readJson(url));
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read ${url}`);
  }
  return response.json();
}

async function waitFor(callback, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(100);
  }
  throw lastError ?? new Error('Timed out waiting for browser.');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopChrome(chrome) {
  if (chrome.exitCode !== null) {
    return;
  }

  chrome.kill();
  await Promise.race([once(chrome, 'exit'), wait(5000)]);
}

async function removeTemporaryProfile(profilePath) {
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(profilePath, { recursive: true, force: true, maxRetries: 1, retryDelay: 100 });
      return;
    } catch (error) {
      lastError = error;
      if (error.code !== 'EBUSY' && error.code !== 'EPERM') {
        throw error;
      }
      await wait(250);
    }
  }
  throw lastError;
}

class CdpClient {
  static async connect(url) {
    const socket = new WebSocket(url);
    await once(socket, 'open');
    return new CdpClient(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.socket.close();
  }
}
