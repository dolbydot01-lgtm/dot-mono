import { lazy, Suspense, useEffect, useState } from 'react';
import { InfoPanel } from './components/info/InfoPanel';
import { TopBar, type AppMode } from './components/layout/TopBar';
import { Sidebar } from './components/sidebar/Sidebar';
import { Viewer } from './components/viewer/Viewer';
import { I18nProvider } from './i18n/I18nProvider';

// The explainer video and exam prep are their own chunks; load them only when opened.
const VideoPage = lazy(() => import('./video/VideoPage'));
const ExamPage = lazy(() => import('./exam/ExamPage'));

const modeFromHash = (): AppMode => {
  const h = window.location.hash;
  if (h.startsWith('#video')) return 'video';
  if (h.startsWith('#exam')) return 'exam';
  return 'explore';
};

export default function App() {
  const [mode, setMode] = useState<AppMode>(modeFromHash);

  // Keep the mode in the URL so the video page can be linked to directly.
  useEffect(() => {
    const onHash = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const changeMode = (next: AppMode) => {
    window.location.hash = next === 'explore' ? '' : next;
    setMode(next);
  };

  return (
    <I18nProvider>
      <div className={`app ${mode !== 'explore' ? 'app--video' : ''}`}>
        <TopBar mode={mode} onModeChange={changeMode} />
        {mode === 'explore' ? (
          <>
            <Sidebar />
            <Viewer />
            <InfoPanel />
          </>
        ) : (
          <Suspense fallback={<div className="video-loading" />}>{mode === 'video' ? <VideoPage /> : <ExamPage />}</Suspense>
        )}
      </div>
    </I18nProvider>
  );
}
