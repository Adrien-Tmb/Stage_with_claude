import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { cx } from '../../lib/utils.js';

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-brand-500' },
  info: { icon: Info, cls: 'text-sky-500' },
  warning: { icon: TriangleAlert, cls: 'text-amber-500' },
};

export default function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.variant] ?? STYLES.info;
        return (
          <div key={t.id} className="card pointer-events-auto flex items-start gap-3 px-4 py-3 animate-fade-up dark:bg-ink-850">
            <Icon size={18} className={cx('mt-0.5 shrink-0', cls)} />
            <p className="flex-1 text-sm text-ink-700 dark:text-ink-200">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-700 dark:hover:text-white" aria-label="Fermer"><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}
