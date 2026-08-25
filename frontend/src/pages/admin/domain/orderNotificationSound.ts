/** Browser-only alert. It intentionally has no external audio asset. */
let notificationAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const browserWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = browserWindow.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  notificationAudioContext ||= new AudioContextConstructor();
  return notificationAudioContext;
}

export function prepareOrderNotificationSound() {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume();
}

export function playOrderNotificationSound() {
  const context = getAudioContext();
  if (!context) return;

  try {
    const playTone = () => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.28, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.34);
    };
    if (context.state === 'suspended') {
      void context
        .resume()
        .then(playTone)
        .catch(() => undefined);
    } else {
      playTone();
    }
  } catch {
    // Browsers can block sound before a user gesture; the order refresh still occurs.
  }
}
