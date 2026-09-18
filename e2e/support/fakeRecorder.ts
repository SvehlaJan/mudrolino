import type { Page } from '@playwright/test';

export async function installFakeRecorder(page: Page) {
  await page.addInitScript(() => {
    const control = {
      mode: 'success', tracks: 0, contexts: 0, recorders: 0, plays: 0,
      pendingPermission: null as (() => void) | null,
      pendingDecode: null as (() => void) | null,
    };
    Object.assign(window, { __fakeRecorder: control });
    class FakeAudioContext {
      closed = false;
      constructor() { control.contexts++; }
      createMediaStreamSource() { return { connect() {} }; }
      createAnalyser() {
        return { fftSize: 0, frequencyBinCount: 8, getFloatTimeDomainData(values: Float32Array) { values.fill(0.2); } };
      }
      async decodeAudioData() {
        if (control.mode === 'processing-failed') throw new Error('Decode failed');
        if (control.mode === 'delayed-processing') await new Promise<void>(resolve => { control.pendingDecode = resolve; });
        return { getChannelData: () => new Float32Array(4410).fill(0.2) };
      }
      close() {
        if (!this.closed) { this.closed = true; control.contexts--; }
        return Promise.resolve();
      }
    }
    class FakeMediaRecorder {
      state = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() { this.state = 'recording'; control.recorders++; }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        control.recorders--;
        const data = this.ondataavailable;
        const stop = this.onstop;
        setTimeout(() => {
          data?.({ data: new Blob(['audio']) });
          stop?.();
        }, 0);
      }
    }
    Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext });
    Object.defineProperty(window, 'MediaRecorder', { value: FakeMediaRecorder });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: async () => {
        if (control.mode === 'denied') throw new DOMException('Denied', 'NotAllowedError');
        if (control.mode === 'delayed-permission') await new Promise<void>(resolve => { control.pendingPermission = resolve; });
        control.tracks++;
        let stopped = false;
        return { getTracks: () => [{ stop() { if (!stopped) { stopped = true; control.tracks--; } } }] };
      } },
    });
    HTMLMediaElement.prototype.play = function () {
      control.plays++;
      queueMicrotask(() => this.dispatchEvent(new Event('ended')));
      return Promise.resolve();
    };
  });
}

export async function fakeRecorderMode(page: Page, mode: string) {
  await page.evaluate(value => {
    (window as unknown as { __fakeRecorder: { mode: string } }).__fakeRecorder.mode = value;
  }, mode);
}

export async function recordingResources(page: Page) {
  return page.evaluate(() => {
    const { tracks, contexts, recorders } = (window as unknown as {
      __fakeRecorder: { tracks: number; contexts: number; recorders: number };
    }).__fakeRecorder;
    return { tracks, contexts, recorders };
  });
}

export async function storedRecordings(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('hrave-ucenie-audio-overrides', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const store = db.transaction('overrides', 'readonly').objectStore('overrides');
      const keys = await new Promise<IDBValidKey[]>(resolve => { store.getAllKeys().onsuccess = event => resolve((event.target as IDBRequest).result); });
      const values = await Promise.all(keys.map(key => new Promise<{ key: string; size: number; type: string; header: string }>(resolve => {
        db.transaction('overrides', 'readonly').objectStore('overrides').get(key).onsuccess = async event => {
          const blob = (event.target as IDBRequest<Blob>).result;
          resolve({ key: String(key), size: blob.size, type: blob.type, header: await blob.slice(0, 4).text() });
        };
      })));
      return values;
    } finally { db.close(); }
  });
}
