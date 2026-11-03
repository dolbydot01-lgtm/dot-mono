import { useState } from 'react';
import { CONCEPTS } from '../../data/concepts';
import { ConceptCard } from './ConceptCard';

export function ConceptsTab() {
  const [openId, setOpenId] = useState<string | null>(CONCEPTS[0].id);
  return (
    <div className="concepts">
      {CONCEPTS.map((c) => (
        <ConceptCard
          key={c.id}
          concept={c}
          open={openId === c.id}
          onToggle={() => setOpenId((id) => (id === c.id ? null : c.id))}
        />
      ))}
    </div>
  );
}
