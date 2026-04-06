import { useState } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import { formatBytes } from '../lib/format';
import { clsx } from 'clsx';
import {
  Play, Square, RotateCcw, Pause, Trash2, PauseOctagon,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function statusColor(status) {
  if (status === 'running') return 'bg-accent-green';
  if (status === 'paused')  return 'bg-accent-yellow';
  return 'bg-red-500';
}

function statusLabel(status) {
  if (status === 'running') return 'running';
  if (status === 'paused')  return 'paused';
  return status; // exited, created, dead…
}

function MiniBar({ pct, color = 'accent' }) {
  const colorClass = {
    accent: 'bg-accent',
    green:  'bg-accent-green',
    yellow: 'bg-accent-yellow',
    red:    'bg-red-500',
  }[color];

  const barColor =
    pct > 85 ? colorClass.replace(colorClass, 'bg-red-500') :
    pct > 60 ? 'bg-accent-yellow' :
    colorClass;

  return (
    <div className="w-full bg-surface rounded-full h-1.5 mt-1">
      <div
        className={clsx('h-1.5 rounded-full transition-all', barColor)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ── action button ─────────────────────────────────────────────────────────────

function ActionBtn({ onClick, disabled, loading, icon: Icon, label, variant = 'default' }) {
  const variants = {
    default:  'text-white/50 hover:text-white hover:bg-white/10',
    danger:   'text-red-400/70 hover:text-red-400 hover:bg-red-400/10',
    green:    'text-accent-green/70 hover:text-accent-green hover:bg-accent-green/10',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      className={clsx(
        'p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        variants[variant],
      )}
    >
      {loading
        ? <span className="block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
        : <Icon size={14} />
      }
    </button>
  );
}

// ── container row ─────────────────────────────────────────────────────────────

function ContainerRow({ container, onAction }) {
  const [pending, setPending] = useState(null);

  const act = async (action) => {
    setPending(action);
    await onAction(container.id, action);
    setPending(null);
  };

  const isRunning = container.status === 'running';
  const isPaused  = container.status === 'paused';
  const isStopped = !isRunning && !isPaused;

  const ports = container.ports
    ?.filter(p => p.PublicPort)
    .map(p => `${p.PublicPort}→${p.PrivatePort}`)
    .join(', ');

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3 rounded-xl border border-surface-border bg-surface-card hover:border-white/10 transition-colors">

      {/* Status dot */}
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', statusColor(container.status))} />

      {/* Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-mono text-sm font-medium truncate">{container.name}</span>
          <span className={clsx(
            'text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wide',
            container.status === 'running' ? 'bg-accent-green/10 text-accent-green' :
            container.status === 'paused'  ? 'bg-accent-yellow/10 text-accent-yellow' :
                                             'bg-red-500/10 text-red-400',
          )}>
            {statusLabel(container.status)}
          </span>
        </div>

        <p className="text-white/40 text-xs font-mono truncate mt-0.5">{container.image}</p>

        {ports && (
          <p className="text-white/30 text-[11px] font-mono mt-0.5">{ports}</p>
        )}

        {/* CPU / Mem bars (only for running containers) */}
        {isRunning && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-mono text-white/40">
                CPU <span className="text-white/60">{container.cpu}%</span>
              </p>
              <MiniBar pct={container.cpu} color="accent" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-white/40">
                MEM <span className="text-white/60">{container.memPct}%</span>
                {container.memLimit > 0 && (
                  <span className="text-white/30"> · {formatBytes(container.memUsed)}</span>
                )}
              </p>
              <MiniBar pct={container.memPct} color="green" />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isStopped && (
          <ActionBtn icon={Play} label="Start" variant="green"
            loading={pending === 'start'} disabled={!!pending}
            onClick={() => act('start')} />
        )}
        {isRunning && (
          <ActionBtn icon={Pause} label="Pause" variant="default"
            loading={pending === 'pause'} disabled={!!pending}
            onClick={() => act('pause')} />
        )}
        {isPaused && (
          <ActionBtn icon={PauseOctagon} label="Unpause" variant="green"
            loading={pending === 'unpause'} disabled={!!pending}
            onClick={() => act('unpause')} />
        )}
        {(isRunning || isPaused) && (
          <ActionBtn icon={Square} label="Stop" variant="default"
            loading={pending === 'stop'} disabled={!!pending}
            onClick={() => act('stop')} />
        )}
        {(isRunning || isPaused) && (
          <ActionBtn icon={RotateCcw} label="Restart" variant="default"
            loading={pending === 'restart'} disabled={!!pending}
            onClick={() => act('restart')} />
        )}
        <ActionBtn icon={Trash2} label="Remove" variant="danger"
          loading={pending === 'remove'} disabled={!!pending}
          onClick={() => act('remove')} />
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DockerPage() {
  const { latest } = useMetrics();
  const containers = latest?.docker ?? null;

  const handleAction = async (id, action) => {
    try {
      if (action === 'remove') {
        await fetch(`/api/docker/containers/${id}`, { method: 'DELETE', credentials: 'include' });
      } else {
        await fetch(`/api/docker/containers/${id}/${action}`, { method: 'POST', credentials: 'include' });
      }
    } catch (err) {
      console.error('Docker action failed:', err);
    }
  };

  const running = containers?.filter(c => c.status === 'running').length ?? 0;
  const total   = containers?.length ?? 0;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">Docker Containers</h2>
        {containers !== null && (
          <span className="text-xs font-mono text-white/40">
            <span className="text-accent-green">{running}</span> running · {total} total
          </span>
        )}
      </div>

      {/* Loading */}
      {containers === null && (
        <div className="text-white/30 font-mono text-sm text-center py-20">
          Waiting for data…
        </div>
      )}

      {/* Empty */}
      {containers !== null && containers.length === 0 && (
        <div className="text-white/30 font-mono text-sm text-center py-20">
          No containers found
        </div>
      )}

      {/* Container list */}
      {containers !== null && containers.length > 0 && (
        <div className="space-y-2">
          {/* running first, then paused, then stopped */}
          {[...containers]
            .sort((a, b) => {
              const order = { running: 0, paused: 1 };
              return (order[a.status] ?? 2) - (order[b.status] ?? 2);
            })
            .map(c => (
              <ContainerRow key={c.id} container={c} onAction={handleAction} />
            ))
          }
        </div>
      )}
    </div>
  );
}
