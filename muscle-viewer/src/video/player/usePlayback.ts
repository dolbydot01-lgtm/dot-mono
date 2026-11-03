import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../math';

/** A requestAnimationFrame clock with play / pause / seek / rate, like a <video>. */
export function usePlayback(duration: number, initialTime = 0) {
  const [time, setTime] = useState(() => clamp(initialTime, 0, duration));
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const timeRef = useRef(clamp(initialTime, 0, duration));

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Cap the step so a backgrounded tab doesn't jump far ahead.
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const next = Math.min(timeRef.current + dt * rate, duration);
      timeRef.current = next;
      setTime(next);
      if (next >= duration) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rate, duration]);

  const seek = useCallback(
    (t: number) => {
      timeRef.current = clamp(t, 0, duration);
      setTime(timeRef.current);
    },
    [duration],
  );

  const toggle = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setPlaying((p) => !p);
  }, [duration, seek]);

  return { time, playing, rate, setRate, toggle, seek, setPlaying };
}

export type Playback = ReturnType<typeof usePlayback>;
