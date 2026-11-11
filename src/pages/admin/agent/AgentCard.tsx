import type { ReactNode } from 'react';

type AgentCardProps = { title: string; description?: string; action?: ReactNode; children: ReactNode };

export default function AgentCard({ title, description, action, children }: AgentCardProps) {
  return (
    <section className="fx-fade-up fx-neon rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-indigo/10 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="fx-text-gradient font-display text-lg font-semibold leading-[1.2] text-brand-deep">{title}</h2>
          {description && <p className="mt-1 text-sm leading-[1.5] text-brand-deep/70">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const INPUT_CLASS =
  'w-full rounded-xl border border-brand-indigo/20 bg-white px-3 py-2.5 text-sm text-brand-deep placeholder:text-brand-deep/40 transition focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/30';