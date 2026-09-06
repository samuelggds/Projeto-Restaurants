type BrowserWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
  if (!AudioContextCtor) return null;

  try {
    audioContext ??= new AudioContextCtor();
    return audioContext;
  } catch {
    return null;
  }
}

export async function primeKitchenAudio() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch {
    return false;
  }
}

export async function playKitchenNewOrderSound(enabled = true) {
  if (!enabled) return false;
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running') return false;

    const startAt = context.currentTime;
    const tones = [659.25, 880];

    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = startAt + index * 0.16;
      const toneEnd = toneStart + 0.14;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(0.18, toneStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneEnd);
    });

    return true;
  } catch {
    return false;
  }
}
