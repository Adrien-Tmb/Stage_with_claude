// Primitives d'interface réutilisables.
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/utils.js';

export function Card({ className, children, ...props }) {
  return <div className={cx('card', className)} {...props}>{children}</div>;
}

export function CardHeader({ title, subtitle, icon: Icon, action, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Icon size={18} />
          </div>
        )}
        <div>
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="text-xs muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  brand: 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

export function Badge({ tone = 'slate', className, children, style, title }) {
  return (
    <span style={style} title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium', BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

export function SectorBadge({ sector, sectors }) {
  const s = sectors[sector];
  if (!s) return null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
      {s.short}
    </span>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cx('flex cursor-pointer items-start justify-between gap-4', disabled && 'opacity-50')}>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-ink-800 dark:text-ink-100">{label}</span>}
          {description && <span className="block text-xs muted">{description}</span>}
        </span>
      )}
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-ink-700')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

export function Chip({ active, onClick, children, color }) {
  return (
    <button type="button" onClick={onClick} className={active ? 'chip-on' : 'chip-off'}
      style={active && color ? { borderColor: `${color}80`, backgroundColor: `${color}1a`, color } : undefined}>
      {children}
    </button>
  );
}

/** Anneau de score 0–100. */
export function ScoreRing({ value, size = 44, label, color }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const tone = color ?? (value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#94a3b8');
  return (
    <div className="relative inline-flex flex-col items-center" title={label ? `${label} : ${value}/100` : undefined}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-ink-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" stroke={tone} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ink-800 dark:text-white" style={{ height: size }}>
        {value}
      </span>
      {label && <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide muted">{label}</span>}
    </div>
  );
}

export function ProgressBar({ value, color = '#10b981', className }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800', className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'max-w-2xl' }) {
  useEscape(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('card relative flex max-h-[92vh] w-full flex-col animate-fade-up dark:bg-ink-900', size)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-ink-800">
          <div>
            <h2 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs muted">{subtitle}</p>}
          </div>
          <button className="icon-btn -mr-2 -mt-1" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-ink-800">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children, width = 'max-w-2xl' }) {
  useEscape(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside className={cx('absolute right-0 top-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl animate-slide-in dark:border-ink-800 dark:bg-ink-900', width)}>
        {children}
      </aside>
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-xs muted">{hint}</p>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-ink-950/60', className)}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === t.id ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100')}>
          {t.icon && <t.icon size={15} />}
          {t.label}
          {t.count != null && <span className="rounded-md bg-slate-200 px-1.5 text-[10px] dark:bg-ink-700">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-ink-700">
      {Icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-ink-400 dark:bg-ink-800"><Icon size={22} /></div>}
      <p className="font-semibold text-ink-800 dark:text-ink-100">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-glow">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
