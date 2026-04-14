import { useState, useEffect, useRef, useCallback } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import { clsx } from 'clsx';
import { RefreshCw, Play, Square, Terminal, Rocket, List } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

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
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
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

// ── activity log line ─────────────────────────────────────────────────────────

function ActivityLine({ stream, text }) {
  const { ts, msg } = parseLine(text);
  const lines = msg.split('\n').filter(l => l.length > 0);
  return lines.map((line, i) => (
    <div key={i} className="flex gap-3 hover:bg-white/[0.03] px-2 py-[1px] rounded">
      {ts && i === 0
        ? <span className="text-white/25 font-mono text-[11px] flex-shrink-0 select-none w-28">{ts}</span>
        : <span className="w-28 flex-shrink-0" />
      }
      {stream === 'stderr'
        ? <span className="text-red-400/80 font-mono text-[11px] flex-shrink-0 select-none w-7">ERR</span>
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

// ── deploy log viewer ─────────────────────────────────────────────────────────

function DeployLog({ content, loading, error }) {
  if (loading) return <p className="text-white/20 font-mono text-xs text-center pt-16">Loading…</p>;
  if (error)   return <p className="text-red-400/70 font-mono text-xs p-4">Error: {error}</p>;
  if (!content) return null;

  return (
    <div>
      {content.split('\n').map((line, i) => (
        <div key={i} className="flex gap-2 hover:bg-white/[0.03] px-2 py-[1px] rounded">
          <span className="text-white/20 font-mono text-[11px] flex-shrink-0 select-none w-10 text-right">{i + 1}</span>
          <span className={clsx(
            'font-mono text-[11px] break-all',
            /error|fail|fatal/i.test(line)   ? 'text-red-300/90' :
            /warn/i.test(line)               ? 'text-accent-yellow/90' :
            /success|done|ok|✓|✔/i.test(line) ? 'text-accent-green/90' :
                                               'text-white/75',
          )}>
            {line || ' '}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const TAIL_OPTIONS = [50, 100, 200, 500];

export default function LogsPage() {
  const { latest } = useMetrics();
  const containers = latest?.docker?.filter(c => c.status === 'running') ?? [];

  const [selected, setSelected]         = useState(null);
  const [tab, setTab]                   = useState('activity'); // 'activity' | 'deploy'
  const [hasDeployLog, setHasDeployLog] = useState(false);
  const [containerPanelOpen, setContainerPanelOpen] = useState(false);

  // Activity state
  const [activityLogs, setActivityLogs]     = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError]   = useState(null);
  const [tail, setTail]                     = useState(200);
  const [following, setFollowing]           = useState(false);
  const intervalRef = useRef(null);

  // Deploy state
  const [deployContent, setDeployContent] = useState(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError]     = useState(null);

  const bottomRef = useRef(null);

  // ── fetch activity logs ───────────────────────────────────────────────────

  const fetchActivity = useCallback(async (id, t) => {
    if (!id) return;
    setActivityLoading(true);
    setActivityError(null);
    try {
      const res = await fetch(`/api/logs/container/${id}?tail=${t}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      setActivityLogs(await res.json());
    } catch (err) {
      setActivityError(err.message);
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // ── fetch deploy log ──────────────────────────────────────────────────────

  const fetchDeploy = useCallback(async (name) => {
    if (!name) return;
    setDeployLoading(true);
    setDeployError(null);
    setDeployContent(null);
    try {
      const res = await fetch(`/api/logs/deploy/${name}`, { credentials: 'include' });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      setDeployContent(await res.text());
    } catch (err) {
      setDeployError(err.message);
    } finally {
      setDeployLoading(false);
    }
  }, []);

  // ── check deploy log existence when container changes ─────────────────────

  const selectContainer = useCallback(async (container) => {
    setSelected(container);
    setTab('activity');
    setActivityLogs([]);
    setDeployContent(null);
    setFollowing(false);
    setHasDeployLog(false);
    setContainerPanelOpen(false); // close panel on mobile after selecting

    // Check if deploy log exists
    try {
      const res = await fetch(`/api/logs/deploy/${container.name}/exists`, { credentials: 'include' });
      const { exists } = await res.json();
      setHasDeployLog(exists);
    } catch {
      setHasDeployLog(false);
    }
  }, []);

  // ── effects ───────────────────────────────────────────────────────────────

  // Load activity logs when container or tail changes
  useEffect(() => {
    if (selected && tab === 'activity') fetchActivity(selected.id, tail);
  }, [selected, tail, tab, fetchActivity]);

  // Load deploy log when deploy tab is opened
  useEffect(() => {
    if (selected && tab === 'deploy' && deployContent === null && !deployLoading) {
      fetchDeploy(selected.name);
    }
  }, [tab, selected, deployContent, deployLoading, fetchDeploy]);

  // Follow mode
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (following && selected && tab === 'activity') {
      intervalRef.current = setInterval(() => fetchActivity(selected.id, tail), 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [following, selected, tail, tab, fetchActivity]);

  // Auto-scroll
  useEffect(() => {
    if (tab === 'activity') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLogs, tab]);

  // Auto-select first container
  useEffect(() => {
    if (!selected && containers.length > 0) selectContainer(containers[0]);
  }, [containers, selected, selectContainer]);

  const toggleFollow = () => {
    if (!following) fetchActivity(selected.id, tail);
    setFollowing(f => !f);
  };

  const isActivity = tab === 'activity';
  const isDeploy   = tab === 'deploy';

  return (
    // Mobile: subtract top bar height (h-14 = 56px); desktop: full viewport height
    <div className="flex h-[calc(100vh-56px)] lg:h-screen overflow-hidden">

      {/* ── Container sidebar ── */}
      <aside className={clsx(
        'flex-col flex-shrink-0 border-r border-surface-border',
        // Desktop: always visible
        // Mobile: toggleable (hidden by default)
        containerPanelOpen ? 'flex w-56' : 'hidden lg:flex lg:w-56',
      )}>
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
              selected={selected?.id === c.id}
              onClick={() => selectContainer(c)}
            />
          ))}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Tabs + controls */}
        <div className="flex items-center border-b border-surface-border flex-shrink-0 px-2">

          {/* Mobile: toggle container list */}
          <button
            onClick={() => setContainerPanelOpen(v => !v)}
            className={clsx(
              'lg:hidden p-1.5 mr-1 rounded-lg text-xs font-mono transition-colors',
              containerPanelOpen
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white hover:bg-white/5',
            )}
            title="Containers"
          >
            <List size={13} />
          </button>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setTab('activity')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors',
                isActivity
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5',
              )}
            >
              <Terminal size={11} />
              Activity
            </button>

            {hasDeployLog && (
              <button
                onClick={() => setTab('deploy')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors',
                  isDeploy
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5',
                )}
              >
                <Rocket size={11} />
                Deploy
              </button>
            )}
          </div>

          <div className="flex-1" />

          {/* Activity controls */}
          {isActivity && selected && (
            <div className="flex items-center gap-2 pr-2">
              <select
                value={tail}
                onChange={e => setTail(Number(e.target.value))}
                className="bg-surface-card border border-surface-border text-white/60 text-xs font-mono rounded-lg px-2 py-1 focus:outline-none focus:border-accent/50"
              >
                {TAIL_OPTIONS.map(n => (
                  <option key={n} value={n}>last {n}</option>
                ))}
              </select>

              <button
                onClick={() => fetchActivity(selected.id, tail)}
                disabled={activityLoading}
                title="Refresh"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              >
                <RefreshCw size={13} className={activityLoading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={toggleFollow}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
                  following
                    ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                    : 'text-white/40 hover:text-white hover:bg-white/10 border border-transparent',
                )}
              >
                {following ? <Square size={11} /> : <Play size={11} />}
                {following ? 'live' : 'follow'}
              </button>
            </div>
          )}

          {/* Deploy controls */}
          {isDeploy && selected && (
            <div className="flex items-center gap-2 pr-2">
              <button
                onClick={() => { setDeployContent(null); fetchDeploy(selected.name); }}
                disabled={deployLoading}
                title="Reload deploy log"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              >
                <RefreshCw size={13} className={deployLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>

        {/* Log output */}
        <div className="flex-1 overflow-y-auto bg-[#0a0d14] p-3">

          {!selected && (
            <p className="text-white/20 font-mono text-xs text-center pt-16">
              Select a container from the sidebar
            </p>
          )}

          {/* Activity tab */}
          {isActivity && selected && (
            <>
              {activityLoading && activityLogs.length === 0 && (
                <p className="text-white/20 font-mono text-xs text-center pt-16">Loading…</p>
              )}
              {activityError && (
                <p className="text-red-400/70 font-mono text-xs p-4">Error: {activityError}</p>
              )}
              {activityLogs.length > 0 && (
                <div>
                  {activityLogs.map((line, i) => (
                    <ActivityLine key={i} stream={line.stream} text={line.text} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
              {!activityLoading && !activityError && activityLogs.length === 0 && (
                <p className="text-white/20 font-mono text-xs text-center pt-16">No logs</p>
              )}
            </>
          )}

          {/* Deploy tab */}
          {isDeploy && selected && (
            <DeployLog
              content={deployContent}
              loading={deployLoading}
              error={deployError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
