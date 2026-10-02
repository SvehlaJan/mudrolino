export interface AudioStubOptions {
  holdPraise: boolean;
  holdPaths: string[];
  holdFirstClip: boolean;
  priority: number;
}

/** Serialized into each browser document; keep these initializers self-contained. */
export function installSpeechStub(priority: number): void {
  const testWindow = window as typeof window & { __speechStubPriority?: number };
  if ((testWindow.__speechStubPriority ?? 0) > priority) return;
  testWindow.__speechStubPriority = priority;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const prototype = Object.getPrototypeOf(synth) as SpeechSynthesis;
  prototype.speak = function speak(utterance: SpeechSynthesisUtterance) {
    setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0);
  };
}

export function installAudioStub({ holdPraise, holdPaths, holdFirstClip, priority }: AudioStubOptions): void {
  const testWindow = window as typeof window & {
    __heldAudio?: HTMLMediaElement[];
    __holdAudioPaths?: string[];
    __audioStubPriority?: number;
  };
  // Playwright does not guarantee init-script execution order. The last registered
  // options win even if its initializer executes before the fixture's default.
  if ((testWindow.__audioStubPriority ?? 0) > priority) return;
  testWindow.__audioStubPriority = priority;
  let firstClip = true;
  HTMLMediaElement.prototype.play = function play() {
    const holdOpeningClip = holdFirstClip && firstClip;
    firstClip = false;
    const shouldHold = testWindow.__holdAudioPaths?.some(path => this.src.includes(path))
      || holdOpeningClip
      || (holdPraise && this.src.includes('/praise/'))
      || holdPaths.some(path => this.src.includes(path));
    if (shouldHold) {
      (testWindow.__heldAudio ??= []).push(this);
      return Promise.resolve();
    }
    setTimeout(() => this.dispatchEvent(new Event('ended')), 0);
    return Promise.resolve();
  };
}
