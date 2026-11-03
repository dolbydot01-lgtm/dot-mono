import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { cueAt } from '../timeline';
import { Controls } from './Controls';
import { Stage } from './Stage';
import type { Playback } from './usePlayback';

export function VideoPlayer({ playback }: { playback: Playback }) {
  const { l } = useI18n();
  const shellRef = useRef<HTMLDivElement>(null);
  const [subtitles, setSubtitles] = useState(true);
  const { time, toggle, seek } = playback;
  const cue = cueAt(time);

  // Keyboard: space = play/pause, ←/→ = ±5 s, C = subtitles.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, button')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'ArrowRight') seek(time + 5);
      else if (e.code === 'ArrowLeft') seek(time - 5);
      else if (e.code === 'KeyC') setSubtitles((s) => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, seek, time]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shellRef.current?.requestFullscreen?.();
  };

  return (
    <div className="player" ref={shellRef}>
      <div className="player__screen" onClick={toggle}>
        <Stage time={time} />
        {subtitles && cue && (
          <div className="subtitle" key={cue.text.en}>
            <span>{l(cue.text)}</span>
          </div>
        )}
        {!playback.playing && (
          <div className="player__big-play" aria-hidden>
            ▶
          </div>
        )}
      </div>
      <Controls playback={playback} subtitles={subtitles} onToggleSubtitles={() => setSubtitles((s) => !s)} onFullscreen={fullscreen} />
    </div>
  );
}
