import { useEffect, useState } from 'react';

export function BrandTypewriter({
  text,
  start = 0,
  interval = 0.07,
  reverse = false,
  animate,
}: {
  text: string;
  start?: number;
  interval?: number;
  reverse?: boolean;
  animate: boolean;
}) {
  const [visible, setVisible] = useState(() =>
    !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 0,
  );
  useEffect(() => {
    if (!animate) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    const started = performance.now();
    const tick = () => {
      const count = motion.matches
        ? text.length
        : Math.max(
            0,
            Math.min(
              text.length,
              Math.floor((performance.now() - started - start * 1000) / (interval * 1000)) + 1,
            ),
          );
      setVisible(count);
      if (count < text.length) timer = setTimeout(tick, Math.max(16, interval * 1000));
    };
    const reduceMotion = () => {
      if (motion.matches) {
        clearTimeout(timer);
        setVisible(text.length);
      }
    };
    timer = setTimeout(tick, motion.matches ? 0 : start * 1000);
    motion.addEventListener('change', reduceMotion);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener('change', reduceMotion);
    };
  }, [animate, interval, start, text.length]);
  return [...text].map((letter, index) => (
    <tspan
      key={index}
      className="brand-letter"
      opacity={(reverse ? text.length - 1 - index : index) < visible ? 1 : 0}
    >
      {letter}
    </tspan>
  ));
}
