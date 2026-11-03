import { useState, type ReactNode } from 'react';

export interface ListItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: ReactNode;
  color?: string;
}

interface ListGroupProps {
  title: string;
  items: ListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  defaultOpen?: boolean;
}

/** A collapsible titled list of selectable rows. */
export function ListGroup({ title, items, activeId, onSelect, defaultOpen = true }: ListGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;

  return (
    <div className="list-group">
      <button type="button" className="list-group__header" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`list-group__caret ${open ? 'is-open' : ''}`}>▸</span>
        <span>{title}</span>
        <span className="list-group__count">{items.length}</span>
      </button>
      {open && (
        <ul className="list-group__items">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`list-item ${activeId === item.id ? 'is-active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                {item.color && <span className="list-item__dot" style={{ background: item.color }} />}
                <span className="list-item__text">
                  <span className="list-item__label">{item.label}</span>
                  {item.sublabel && <span className="list-item__sub">{item.sublabel}</span>}
                </span>
                {item.badge}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
