import { useState } from 'react';
import { BONES } from '../../data/bones';
import { JOINT_TYPE_COLORS, JOINTS } from '../../data/joints';
import { MUSCLES } from '../../data/muscles';
import { REGIONS } from '../../data/regions';
import type { Localized, SelectionKind } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { useViewerStore } from '../../store/viewerStore';
import { LayerBadge } from './LayerBadge';
import { ListGroup, type ListItem } from './ListGroup';

/** Matches either language so users can search in Chinese or English regardless of UI language. */
function matches(query: string, ...texts: (Localized | string)[]) {
  if (!query) return true;
  const q = query.toLowerCase();
  return texts.some((t) =>
    typeof t === 'string' ? t.toLowerCase().includes(q) : t.zh.includes(q) || t.en.toLowerCase().includes(q),
  );
}

export function ExploreTab() {
  const { t, l, lang } = useI18n();
  const [query, setQuery] = useState('');
  const selection = useViewerStore((s) => s.selection);
  const select = useViewerStore((s) => s.select);

  const activeId = (kind: SelectionKind) => (selection?.kind === kind ? selection.id : null);
  const secondary = (v: Localized) => (lang === 'zh' ? v.en : undefined);

  const muscleGroups = REGIONS.map((region) => ({
    region,
    items: MUSCLES.filter((m) => m.region === region.id && matches(query, m.name, m.latin)).map<ListItem>((m) => ({
      id: m.id,
      label: l(m.name),
      sublabel: secondary(m.name),
      badge: <LayerBadge layer={m.layer} />,
    })),
  })).filter((g) => g.items.length);

  const joints = JOINTS.filter((j) => matches(query, j.name)).map<ListItem>((j) => ({
    id: j.id,
    label: l(j.name),
    sublabel: secondary(j.name),
    color: JOINT_TYPE_COLORS[j.type],
  }));

  const bones = BONES.filter((b) => matches(query, b.name, b.latin)).map<ListItem>((b) => ({
    id: b.id,
    label: l(b.name),
    sublabel: secondary(b.name),
    badge: <span className="count-badge">×{b.count}</span>,
  }));

  const empty = !muscleGroups.length && !joints.length && !bones.length;

  return (
    <div className="explore">
      <div className="search">
        <input
          type="search"
          className="search__input"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {empty && <p className="muted">{t('list.empty')}</p>}

      {muscleGroups.length > 0 && <h2 className="explore__heading">{t('list.muscles')}</h2>}
      {muscleGroups.map(({ region, items }) => (
        <ListGroup
          key={region.id}
          title={l(region.name)}
          items={items}
          activeId={activeId('muscle')}
          onSelect={(id) => select({ kind: 'muscle', id })}
        />
      ))}

      {(joints.length > 0 || bones.length > 0) && <h2 className="explore__heading">{t('list.joints')} · {t('list.bones')}</h2>}
      <ListGroup title={t('list.joints')} items={joints} activeId={activeId('joint')} onSelect={(id) => select({ kind: 'joint', id })} />

      <ListGroup
        title={t('list.bones')}
        items={bones}
        activeId={activeId('bone')}
        onSelect={(id) => select({ kind: 'bone', id })}
        defaultOpen={false}
      />
    </div>
  );
}
