import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import { ConceptsTab } from './ConceptsTab';
import { ExploreTab } from './ExploreTab';
import './sidebar.css';

type Tab = 'explore' | 'concepts';

export function Sidebar() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('explore');

  return (
    <aside className="sidebar">
      <nav className="tabs" role="tablist">
        {(['explore', 'concepts'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tabs__tab ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(id === 'explore' ? 'tab.explore' : 'tab.concepts')}
          </button>
        ))}
      </nav>
      <div className="sidebar__body">{tab === 'explore' ? <ExploreTab /> : <ConceptsTab />}</div>
    </aside>
  );
}
