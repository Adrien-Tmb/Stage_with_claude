import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, ListOrdered, Plus, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { SORT_KEYS } from '../../lib/scoring.js';
import { cx } from '../../lib/utils.js';

const PRESETS = {
  france: [
    { label: 'Proximité', keys: ['distance', 'duration', 'sector', 'companySize', 'match', 'interest'] },
    { label: 'Recommandé', keys: ['duration', 'sector', 'distance', 'companySize', 'match', 'interest'] },
    { label: 'Meilleur match', keys: ['match', 'interest', 'duration', 'distance'] },
    { label: 'Mes goûts', keys: ['interest', 'match', 'distance'] },
  ],
  international: [
    { label: 'Europe anglophone', keys: ['region', 'duration', 'sector', 'match', 'companySize', 'interest'] },
    { label: 'Recommandé', keys: ['duration', 'sector', 'region', 'companySize', 'match'] },
    { label: 'Meilleur match', keys: ['match', 'interest', 'region', 'duration'] },
    { label: 'Plus proche', keys: ['distance', 'duration', 'match'] },
  ],
};

/** Éditeur de l'ordre de priorité du tri (glisser-déposer ou flèches). */
export default function SortPriorityEditor({ space, compact = false }) {
  const keys = useAppStore((s) => s.settings.sorting[space]);
  const sizeOrder = useAppStore((s) => s.settings.sorting.companySizeOrder);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [drag, setDrag] = useState(null);
  const set = (next) => updateSettings(`sorting.${space}`, next);
  const available = Object.keys(SORT_KEYS).filter((k) => !keys.includes(k) && (space === 'international' || k !== 'region'));

  const move = (i, dir) => {
    const next = [...keys];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const onDrop = (i) => {
    if (drag == null || drag === i) return;
    const next = [...keys];
    const [item] = next.splice(drag, 1);
    next.splice(i, 0, item);
    set(next);
    setDrag(null);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-center gap-2">
          <ListOrdered size={16} className="text-brand-500" />
          <p className="section-title">Ordre de priorité du tri</p>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS[space].map((p) => (
          <button key={p.label} onClick={() => set(p.keys)}
            className={JSON.stringify(p.keys) === JSON.stringify(keys) ? 'chip-on' : 'chip-off'}>{p.label}</button>
        ))}
      </div>
      <ol className="space-y-1.5">
        {keys.map((k, i) => (
          <li key={k} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
            className={cx('flex items-center gap-2 rounded-xl border bg-white px-2 py-1.5 text-sm dark:bg-ink-950/50',
              drag === i ? 'border-brand-500' : 'border-slate-200 dark:border-ink-800')}>
            <GripVertical size={14} className="cursor-grab text-ink-400" />
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/10 text-[11px] font-bold text-brand-700 dark:text-brand-300">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink-800 dark:text-ink-100">{SORT_KEYS[k].label}</p>
              {!compact && <p className="truncate text-[11px] muted">{SORT_KEYS[k].hint}</p>}
            </div>
            {k === 'companySize' && (
              <button onClick={() => updateSettings('sorting.companySizeOrder', sizeOrder === 'desc' ? 'asc' : 'desc')}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                title="Inverser l'ordre">
                {sizeOrder === 'desc' ? 'Grands → petits' : 'Petits → grands'}
              </button>
            )}
            <button className="text-ink-400 hover:text-ink-700 dark:hover:text-white" onClick={() => move(i, -1)} aria-label="Monter"><ArrowUp size={14} /></button>
            <button className="text-ink-400 hover:text-ink-700 dark:hover:text-white" onClick={() => move(i, 1)} aria-label="Descendre"><ArrowDown size={14} /></button>
            <button className="text-ink-400 hover:text-rose-500" onClick={() => set(keys.filter((x) => x !== k))} aria-label="Retirer"><X size={14} /></button>
          </li>
        ))}
      </ol>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.map((k) => (
            <button key={k} onClick={() => set([...keys, k])} className="chip-off"><Plus size={12} />{SORT_KEYS[k].label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
