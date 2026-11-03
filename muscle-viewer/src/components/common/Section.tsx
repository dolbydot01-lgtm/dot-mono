import type { ReactNode } from 'react';
import './common.css';

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <header className="section__header">
        <h3 className="section__title">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}
