import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';
import { BilingualContext } from './components/bilingualContext';
import { ExamHome } from './components/ExamHome';
import { PrintView } from './components/PrintView';
import { ResultView } from './components/ResultView';
import { SessionView } from './components/SessionView';
import { PAPER_MAP } from './papers';
import { useExam } from './useExam';
import './exam.css';

const BILINGUAL_KEY = 'anatomy3d.exam.bilingual';

function loadBilingual() {
  try {
    return localStorage.getItem(BILINGUAL_KEY) === '1';
  } catch {
    return false;
  }
}

export default function ExamPage() {
  const { t } = useI18n();
  const api = useExam();
  const [bilingual, setBilingual] = useState(loadBilingual);
  // An unfinished attempt waits on the home screen until the user resumes it.
  const [paused, setPaused] = useState(true);
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(BILINGUAL_KEY, bilingual ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [bilingual]);

  const { session } = api;
  const paper = session ? PAPER_MAP[session.paperId] : null;

  const start = (paperId: string, mode: 'practice' | 'exam') => {
    api.start(paperId, mode);
    setPaused(false);
  };

  let content;
  if (printing) {
    content = <PrintView paper={PAPER_MAP[printing]} onBack={() => setPrinting(null)} />;
  } else if (session && paper && session.submittedAt) {
    content = <ResultView paper={paper} session={session} api={api} onRetry={() => start(paper.id, session.mode)} />;
  } else if (session && paper && !paused) {
    content = <SessionView paper={paper} session={session} api={api} onExit={() => setPaused(true)} />;
  } else {
    content = (
      <ExamHome
        history={api.history}
        pending={session}
        onStart={start}
        onResume={() => setPaused(false)}
        onDiscard={api.exit}
        onPrint={setPrinting}
      />
    );
  }

  return (
    <BilingualContext.Provider value={bilingual}>
      <main className="exam-page">
        <div className="exam-page__tools">
          <label className="toggle">
            <input type="checkbox" checked={bilingual} onChange={(e) => setBilingual(e.target.checked)} />
            <span>{t('exam.bilingual')}</span>
          </label>
        </div>
        {content}
      </main>
    </BilingualContext.Provider>
  );
}
