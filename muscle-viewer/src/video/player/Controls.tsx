import { useRef, useState, type PointerEvent } from 'react';
import { useI18n } from '../../i18n/context';
import { clamp } from '../math';
import { formatTime, SCENES, TOTAL_DURATION } from '../timeline';
import type { Playback } from './usePlayback';

const RATES = [0.5, 1, 1.5, 2];

interface ControlsProps {
  playback: Playback;
  subtitles: boolean;
  onToggleSubtitles: () => void;
  onFullscreen: () => void;
}

export function Controls({ playback, subtitles, onToggleSubtitles, onFullscreen }: ControlsProps) {
  const { t, l } = useI18n();
  const { time, playing, rate, setRate, toggle, seek } = playback;
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const timeAt = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width) * TOTAL_DURATION;
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(timeAt(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    setHover(timeAt(e.clientX));
    if (e.buttons & 1) seek(timeAt(e.clientX));
  };
  const hoverScene = hover === null ? null : SCENES.find((s) => hover >= s.start && hover < s.start + s.duration);

  return (
    <div className="controls">
      <div
        ref={barRef}
        className="seek"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="slider"
        aria-label={t('video.seek')}
        aria-valuemin={0}
        aria-valuemax={TOTAL_DURATION}
        aria-valuenow={Math.round(time)}
        tabIndex={0}
      >
        {SCENES.map((s) => {
          const fill = clamp((time - s.start) / s.duration);
          return (
            <div key={s.id} className="seek__chapter" style={{ flex: s.duration }}>
              <div className="seek__fill" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
        <div className="seek__thumb" style={{ left: `${(time / TOTAL_DURATION) * 100}%` }} />
        {hover !== null && hoverScene && (
          <div className="seek__tooltip" style={{ left: `${(hover / TOTAL_DURATION) * 100}%` }}>
            {formatTime(hover)} · {l(hoverScene.title)}
          </div>
        )}
      </div>

      <div className="controls__row">
        <button type="button" className="ctrl-btn ctrl-btn--play" onClick={toggle} aria-label={playing ? t('video.pause') : t('video.play')}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="ctrl-btn" onClick={() => seek(time - 5)} aria-label={t('video.back5')}>
          ↺ 5s
        </button>
        <button type="button" className="ctrl-btn" onClick={() => seek(time + 5)} aria-label={t('video.forward5')}>
          5s ↻
        </button>
        <span className="controls__time">
          {formatTime(time)} / {formatTime(TOTAL_DURATION)}
        </span>
        <span className="controls__spacer" />
        <div className="rate" role="radiogroup" aria-label={t('video.speed')}>
          {RATES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rate === r} className={`rate__btn ${rate === r ? 'is-active' : ''}`} onClick={() => setRate(r)}>
              {r}×
            </button>
          ))}
        </div>
        <button type="button" className={`ctrl-btn ${subtitles ? 'is-on' : ''}`} onClick={onToggleSubtitles} aria-pressed={subtitles} title={t('video.subtitles')}>
          CC
        </button>
        <button type="button" className="ctrl-btn" onClick={onFullscreen} title={t('video.fullscreen')} aria-label={t('video.fullscreen')}>
          ⛶
        </button>
      </div>
    </div>
  );
}
