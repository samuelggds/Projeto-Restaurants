let waiterAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const browserWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor =
    browserWindow.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  waiterAudioContext ||= new AudioContextConstructor();
  return waiterAudioContext;
}

export function prepareWaiterCallAlarm() {
  const context = getAudioContext();
  if (context?.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }
}

function playAlarmSequence(context: AudioContext) {
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.92, now);
  master.connect(context.destination);

  const tones = [
    { at: 0, frequency: 1046.5, duration: 0.28 },
    { at: 0.34, frequency: 1318.5, duration: 0.28 },
    { at: 0.68, frequency: 1046.5, duration: 0.34 },
    { at: 1.08, frequency: 1568, duration: 0.42 },
  ];

  for (const tone of tones) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = now + tone.at;
    const stopAt = startAt + tone.duration;

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.88, startAt + 0.025);
    gain.gain.setValueAtTime(0.88, Math.max(startAt + 0.03, stopAt - 0.06));
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain).connect(master);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  }

  window.setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      // O alarme seguinte continua funcionando mesmo se o contexto já tiver sido fechado.
    }
  }, 1700);
}

export function playWaiterCallAlarmPulse() {
  const context = getAudioContext();

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([900, 220, 900, 220, 1200]);
  }

  if (!context) return;

  const play = () => {
    try {
      playAlarmSequence(context);
    } catch {
      // Alguns navegadores bloqueiam áudio até a primeira interação do usuário.
    }
  };

  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => undefined);
  } else {
    play();
  }
}

export function stopWaiterCallAlarm() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(0);
  }
}
