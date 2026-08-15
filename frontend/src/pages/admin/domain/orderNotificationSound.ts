/** Browser-only alert. It intentionally has no external audio asset. */
export function playOrderNotificationSound() {
  if (typeof window === "undefined") return;
  const browserWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = browserWindow.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.34);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Browsers can block sound before a user gesture; the order refresh still occurs.
  }
}
