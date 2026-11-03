import type { ReactNode } from 'react';
import './common.css';

interface ChipProps {
  children: ReactNode;
  color?: string;
  onClick?: () => void;
  title?: string;
}

/** Small pill; becomes a button when `onClick` is given. */
export function Chip({ children, color, onClick, title }: ChipProps) {
  const style = color ? { ['--chip-color' as string]: color } : undefined;
  if (onClick) {
    return (
      <button type="button" className="chip chip--button" style={style} onClick={onClick} title={title}>
        {color && <span className="chip__dot" />}
        {children}
      </button>
    );
  }
  return (
    <span className="chip" style={style} title={title}>
      {color && <span className="chip__dot" />}
      {children}
    </span>
  );
}
