import { useState, useEffect, useRef, useCallback } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import { clsx } from 'clsx';
import { RefreshCw, Play, Square, Terminal } from 'lucide-react';

// Strip ANSI escape codes for clean display
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

// Parse Docker timestamped line: "2024-01-15T10:30:45.123456789Z message"
function parseLine(text) {
  const match = text.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s?([\s\S]*)$/);
  if (!match) return { ts: null, msg: stripAnsi(text) };
  const date = new Date(match[1]);
  const ts = date.toLocaleTimeString('en-GB', { hour12: false }) +
    '.' + String(date.getMilliseconds()).padStart(3, '0');
  return { ts, msg: stripAnsi(match[2]) };
}

// ── sidebar entry ─────────────────────────────────────────────────────────────

function ContainerItem({ container, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors group',
        selected
          ? 'bg-accent/15 border border-accent/30 text-white'
          : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0" />
        <span className="text-xs font-mono truncate">{container.name}</span>
      </div>
      <p className="text-[10px] font-mono text-white/30 truncate pl-3.5 mt-0.5">{container.image}</p>
    </button>
  );
}

// ── log line ──────────────────────────────────────────────────────────────────

function LogLine({ stream, text }) {
  const { ts, msg } = parseLine(text);
  const lines = msg.split('\n').filter(l => l.length > 0);

  return lines.map((line, i) => (
    <div key={i} className="flex gap-3 hover:bg-white/[0.03] px-2 py-[1px] rounded">
      {ts && i === 0
        ? <span className="text-white/25 font-mono text-[11px] flex-shrink-0 select-none w-28">{ts}</span>
        : <span className="w-28 flex-shrink-0" />
      }
      {stream === 'stderr'
        ? <span className="text-red-400/80 font-mono text-[11px] flex-shrink-0 select-none">ERR</span>
        : <span className="w-7 flex-shrink-0" />
      }
      <span className={clsx(
        'font-mono text-[11px] break-all',
        stream === 'stderr' ? 'text-red-300/90' : 'text-white/80',
      )}>
        {line}
      </span>
    </div>
  ));
}

// ── page ──────────────────────────────────────────────────────────────────────

const TAIL_OPTIONS = [50, 100, 200, 500];

export default function LogsPage() {
  const { latest } = useMetrics();
  const containers = latest?.docker?.filter(c => c.status === 'running') ?? [];

  const [selected, setSelected]   = useState(null);
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [tail, setTail]           = useState(200);
  const [following, setFollowing] = useState(false);
  const bottomRef  = useRef(null);
  const intervalRef = useRef(null);

  const fetchLogs = useCallback(async (id, t) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/logs/container/${id}?tail=${t}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      setLogs(await res.json());
    } catch (err) {
      setError(err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // When container or tail changes, reload
  useEffect(() => {
    if (selected) fetchLogs(selected, tail);
  }, [selected, tail, fetchLogs]);

  // Follow mode: refresh every 3s
  useEffect(() => {
    if (following && selected) {
      intervalRef.current = setInterval(() => fetchLogs(selected, tail), 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [following, selected, tail, fetchLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (following || logs.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, following]);

  // Auto-select first container when list loads
  useEffect(() => {
    if (!selected && containers.length > 0) {
      setSelected(containers[0].id);
    }
  }, [containers, selected]);

  const selectContainer = (id) => {
    setSelected(id);
    setLogs([]);
    setError(null);
    setFollowing(false);
  };

  const toggleFollow = () => {
    if (!following) fetchLogs(selected, tail);
    setFollowing(f => !f);
  };

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 border-r border-surface-border flex flex-col">
        <div className="px-3 py-3 border-b border-surface-border">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            Running containers
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {containers.length === 0 && (
            <p className="text-white/20 font-mono text-xs text-center pt-8">No containers</p>
          )}
          {containers.map(c => (
            <ContainerItem
              key={c.id}
              container={c}
              selected={selected === c.id}
              onClick={() => selectContainer(c.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Log viewer ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-border flex-shrink-0">
          <Terminal size={13} className="text-white/30" />
          <span className="text-xs font-mono text-white/50 flex-1 truncate">
            {selected
              ? containers.find(c => c.id === selected)?.name ?? selected
              : 'Select a container'
            }
          </span>

          {/* Tail selector */}
          <select
            value={tail}
            onChange={e => setTail(Number(e.target.value))}
            className="bg-surface-card border border-surface-border text-white/60 text-xs font-mono rounded-lg px-2 py-1 focus:outline-none focus:border-accent/50"
          >
            {TAIL_OPTIONS.map(n => (
              <option key={n} value={n}>last {n}</option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(selected, tail)}
            disabled={!selected || loading}
            title="Refresh"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Follow toggle */}
          <button
            onClick={toggleFollow}
            disabled={!selected}
            title={following ? 'Stop following' : 'Follow (live)'}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors disabled:opacity-30',
              following
                ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                : 'text-white/40 hover:text-white hover:bg-white/10 border border-transparent',
            )}
          >
            {following ? <Square size={11} /> : <Play size={11} />}
            {following ? 'live' : 'follow'}
          </button>
        </div>

        {/* Log output */}
        <div className="flex-1 overflow-y-auto bg-[#0a0d14] p-3">
          {!selected && (
            <p className="text-white/20 font-mono text-xs text-center pt-16">
              Select a container from the sidebar
            </p>
          )}

          {selected && loading && logs.length === 0 && (
            <p className="text-white/20 font-mono text-xs text-center pt-16">Loading…</p>
          )}

          {error && (
            <p className="text-red-400/70 font-mono text-xs p-4">Error: {error}</p>
          )}

          {logs.length > 0 && (
            <div>
              {logs.map((line, i) => (
                <LogLine key={i} stream={line.stream} text={line.text} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {selected && !loading && !error && logs.length === 0 && (
            <p className="text-white/20 font-mono text-xs text-center pt-16">No logs</p>
          )}
        </div>

      </div>
    </div>
  );
}
