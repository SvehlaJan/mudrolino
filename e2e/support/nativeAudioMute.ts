/** Silence native output while preserving the browser's real completion and cancellation events. */
export function installNativeAudioMute(): void {
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function play() {
    this.muted = true;
    return nativePlay.call(this);
  };
  const synth = window.speechSynthesis;
  if (!synth) return;
  const prototype = Object.getPrototypeOf(synth) as SpeechSynthesis;
  const nativeSpeak = prototype.speak;
  prototype.speak = function speak(utterance: SpeechSynthesisUtterance) {
    // System speech output can bypass Chromium's --mute-audio flag on macOS.
    utterance.volume = 0;
    return nativeSpeak.call(this, utterance);
  };
}
