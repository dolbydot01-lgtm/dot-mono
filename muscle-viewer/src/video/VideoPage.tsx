import { useI18n } from '../i18n/context';
import { VideoPlayer } from './player/VideoPlayer';
import { usePlayback } from './player/usePlayback';
import { formatTime, SCENES, sceneAt, TOTAL_DURATION } from './timeline';
import './video.css';

/** `?t=45#video` or `#video?t=45` opens the video at 0:45, like a timestamp link. */
const startTime = () => {
  const fromHash = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('t');
  return Number(fromHash ?? new URLSearchParams(window.location.search).get('t')) || 0;
};

export default function VideoPage() {
  const { t, l } = useI18n();
  const playback = usePlayback(TOTAL_DURATION, startTime());
  const current = sceneAt(playback.time);

  const jump = (time: number) => {
    playback.seek(time);
    playback.setPlaying(true);
  };

  return (
    <main className="video-page">
      <header className="video-page__header">
        <h2>{t('video.title')}</h2>
        <p>{t('video.intro')}</p>
      </header>

      <VideoPlayer playback={playback} />

      <div className="video-page__below">
        <section className="chapters">
          <h3>{t('video.chapters')}</h3>
          <ol>
            {SCENES.map((s) => (
              <li key={s.id}>
                <button type="button" className={`chapter ${current.id === s.id ? 'is-active' : ''}`} onClick={() => jump(s.start)}>
                  <span className="chapter__time">{formatTime(s.start)}</span>
                  <span className="chapter__text">
                    <b>{l(s.title)}</b>
                    <span>{l(s.summary)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="script">
          <h3>{t('video.script')}</h3>
          {SCENES.map((s) => (
            <div key={s.id} className="script__scene">
              <h4>{l(s.title)}</h4>
              {s.cues.map((c, i) => {
                const at = s.start + c.at;
                const next = s.cues[i + 1] ? s.start + s.cues[i + 1].at : s.start + s.duration;
                const active = playback.time >= at && playback.time < next;
                return (
                  <button key={i} type="button" className={`script__cue ${active ? 'is-active' : ''}`} onClick={() => jump(at)}>
                    <span className="script__time">{formatTime(at)}</span>
                    <span>{l(c.text)}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <p className="script__note">{t('video.note')}</p>
        </section>
      </div>
    </main>
  );
}
