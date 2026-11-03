import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em] text-white sm:text-4xl lg:text-5xl">{title}</h1><p className="text-pretty mt-3 text-sm leading-6 text-zinc-400">{description}</p></div>{actions && <div className="shrink-0">{actions}</div>}</div>;
}
