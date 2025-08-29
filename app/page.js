'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faUpload,
  faMousePointer,
  faPenToSquare,
  faKeyboard,
  faListCheck,
  faQuestionCircle,
  faPen,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder, motion } from 'framer-motion';

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="text-sm text-zinc-300">
      {children}
    </label>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  // form state
  const [url, setUrl] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');

  // app state
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedMapName, setSelectedMapName] = useState(null);
  const [stepsDraft, setStepsDraft] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  // inline editing state
  const [openActionIdx, setOpenActionIdx] = useState(null); // which step shows the action dropdown
  const [editingField, setEditingField] = useState({ idx: null, field: null }); // field: 'description' | 'selector' | 'key'
  const [editSnapshot, setEditSnapshot] = useState(null); // { idx, field, value }

  // --- Helpers: ID assignment, dirty state, duplicates, fix, and guarded open ---

  // --- Action icons via Font Awesome + color mapper ---
  function actionMeta(action) {
    const a = String(action || '').toLowerCase();
    if (a === 'download') return { icon: faDownload, classes: 'text-cyan-300 border-cyan-700/50 bg-cyan-900/30' };
    if (a === 'upload') return { icon: faUpload, classes: 'text-emerald-300 border-emerald-700/50 bg-emerald-900/30' };
    if (a === 'click') return { icon: faMousePointer, classes: 'text-sky-300 border-sky-700/50 bg-sky-900/30' };
    if (a === 'fill') return { icon: faPenToSquare, classes: 'text-amber-300 border-amber-700/50 bg-amber-900/30' };
    if (a === 'press') return { icon: faKeyboard, classes: 'text-violet-300 border-violet-700/50 bg-violet-900/30' };
    if (a === 'select') return { icon: faListCheck, classes: 'text-fuchsia-300 border-fuchsia-700/50 bg-fuchsia-900/30' };
    return { icon: faQuestionCircle, classes: 'text-zinc-300 border-zinc-700/50 bg-zinc-900/30' };
  }

  // available actions (used by modal dropdown)
  const ACTIONS = ['download', 'upload', 'click', 'fill', 'press', 'select'];

  // give each step a stable internal id and remember the ORIGINAL saved key
  function assignIdsToSteps(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((s, i) => ({
      __id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${i}`),
      __origKey: (typeof s?.key === 'string' ? s.key : undefined),
      ...s,
    }));
  }

  // strip our internal fields before comparing/saving
  function stripStepIds(arr) {
    return (Array.isArray(arr) ? arr : []).map(({ __id, __origKey, ...rest }) => rest);
  }

  // “unsaved changes” detection
  const isDirty = useMemo(() => {
    if (!selectedMap) return false;
    const original = JSON.stringify(selectedMap.steps || []);
    const draft = JSON.stringify(stripStepIds(stepsDraft || []));
    return original !== draft;
  }, [selectedMap, stepsDraft]);

  // duplicate key detection
  const dupInfo = useMemo(() => {
    const byKey = {};
    (stepsDraft || []).forEach((s, idx) => {
      const k = typeof s?.key === 'string' ? s.key.trim() : '';
      if (!k) return;
      (byKey[k] ||= []).push(idx);
    });
    const duplicates = Object.entries(byKey)
      .filter(([, idxs]) => idxs.length > 1)
      .map(([key, indexes]) => ({ key, indexes }));
    const total = duplicates.reduce((acc, d) => acc + d.indexes.length - 1, 0);
    return { duplicates, total };
  }, [stepsDraft]);

  function fixDuplicateKeys() {
    setStepsDraft(prev => {
      const arr = prev.slice();
      const used = new Set(arr.map(s => (typeof s?.key === 'string' ? s.key : '')));
      const counters = {};
      for (const { key, indexes } of dupInfo.duplicates) {
        counters[key] = counters[key] || 1; // first occurrence stays as-is
        for (let i = 1; i < indexes.length; i++) {
          let candidate;
          do {
            counters[key]++;
            candidate = `${key}_${counters[key]}`;
          } while (used.has(candidate));
          const idx = indexes[i];
          arr[idx] = { ...arr[idx], key: candidate };
          used.add(candidate);
        }
      }
      return arr;
    });
  }

  // opening another map with guard
  function openMapGuard(name) {
    if (isDirty && !confirm('Você tem alterações não salvas. Deseja descartá-las?')) return;
    openMap(name);
  }

  async function loadMapList() {
    setMaps([{ _loading: true }]);
    try {
      const r = await fetch('/api/mapas');
      const j = await r.json();
      setMaps(Array.isArray(j.mapas) ? j.mapas : []);
    } catch (err) {
      setMaps([]);
      setStatus(`Erro ao listar mapas: ${err.message}`);
    }
  }

  async function openMap(name) {
    setStepsDraft([]);
    setDragOverIndex(null);
    setDraggingIndex(null);
    setSelectedMap(null);
    setSelectedMapName(null);

    try {
      const r = await fetch(`/api/mapas/${encodeURIComponent(name)}`);
      if (!r.ok) throw new Error('Falha ao carregar mapa');
      const m = await r.json();

      setSelectedMap(m);
      setSelectedMapName(name);
      setStepsDraft(assignIdsToSteps(m.steps));
    } catch (e) {
      setStatus(`Erro ao abrir mapa: ${e.message}`);
    }
  }


  async function onStart(e) {
    e.preventDefault();
    setBusy(true);
    setStatus('Iniciando mapeamento…');
    try {
      // basic URL validation
      let u;
      try { u = new URL(url); } catch { throw new Error('URL inválida. Informe http(s) válido.'); }
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('URL deve ser http(s).');

      const resp = await fetch('/api/mapear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, nomeArquivo }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.erro || 'Falha ao iniciar');
      setStatus(json.mensagem || 'Mapeamento iniciado. Clique em “Parar”.');
    } catch (err) {
      setStatus(`Erro: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onStop() {
    setBusy(true);
    setStatus('Parando mapeamento…');
    try {
      const resp = await fetch('/api/stop', { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.erro || 'Falha ao parar');
      setStatus(json.mensagem || 'Mapeamento finalizado.');
      await loadMapList();
    } catch (e) {
      setStatus(`Erro ao parar: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveKeys() {
    if (!selectedMapName) return;

    const originalSteps = Array.isArray(selectedMap?.steps) ? selectedMap.steps : [];
    const draftNormalized = stripStepIds(Array.isArray(stepsDraft) ? stepsDraft : []);
    const changed = JSON.stringify(originalSteps) !== JSON.stringify(draftNormalized);

    if (!changed) {
      setStatus('Nenhuma alteração detectada.');
      return;
    }

    setBusy(true);
    setStatus('Salvando…');
    try {
      const r = await fetch(`/api/mapas/${encodeURIComponent(selectedMapName)}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: draftNormalized, mapping: {} }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || 'Falha ao salvar');

      setStatus('Salvo com sucesso.');
      await openMap(selectedMapName); // reload from disk
    } catch (e) {
      setStatus('Erro ao salvar: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  // --- Drag n Drop + Delete for steps + inline key editing ---
  // --- Step actions: delete + inline key editing (DnD handled by Framer Motion) ---
  function onDeleteStep(index) {
    setStepsDraft(prev => prev.filter((_, i) => i !== index));
  }
  function onEditStepKey(index, value) {
    setStepsDraft(prev => {
      const arr = prev.slice();
      arr[index] = { ...arr[index], key: value };
      return arr;
    });
  }

  function commitEdit(index, field, value) {
    setStepsDraft(prev => {
      const arr = prev.slice();
      const s = { ...(arr[index] || {}) };
      if (field === 'description') {
        s.description = String(value || '').trim() || undefined;
      } else if (field === 'selector') {
        s.selector = value || '';
      } else if (field === 'key') {
        const v = String(value || '').trim();
        s.key = v || undefined;
        // __origKey remains the last saved value (will refresh on openMap)
      }
      arr[index] = s;
      return arr;
    });
    setEditingField({ idx: null, field: null });
  }

  // --- Smooth, bidirectional auto-scroll while dragging (uses rAF & easing) ---
  const SCROLL_EDGE = 120;   // px from top/bottom to start scrolling
  const SCROLL_MAX = 8;     // max px/frame (slower than before)
  const SCROLL_EASE = 0.12;  // easing toward target speed (smoother)

  const dragScrollRef = useRef({ raf: 0, vy: 0, targetVy: 0, active: false });

  function tickDragScroll() {
    const st = dragScrollRef.current;

    // ease velocity toward the target
    st.vy = st.vy + (st.targetVy - st.vy) * SCROLL_EASE;

    // stop if essentially idle
    if (Math.abs(st.vy) < 0.1 && Math.abs(st.targetVy) < 0.1) {
      st.active = false;
      st.vy = 0;
      st.targetVy = 0;
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = 0;
      return;
    }

    window.scrollBy(0, st.vy);
    st.raf = requestAnimationFrame(tickDragScroll);
  }

  function handleDragAutoScroll(_event, info) {
    // Framer Motion gives page coords; convert to viewport (client) coords
    const yPage = info?.point?.y;
    if (typeof yPage !== 'number') return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const clientY = yPage - scrollTop;            // 0..vh
    const vh = window.innerHeight || 0;

    let target = 0;

    // top edge
    if (clientY < SCROLL_EDGE) {
      const k = (SCROLL_EDGE - clientY) / SCROLL_EDGE; // 0..1
      target = -SCROLL_MAX * Math.pow(k, 1.5);         // ease-in, slower start
    }
    // bottom edge
    else if (clientY > vh - SCROLL_EDGE) {
      const k = (clientY - (vh - SCROLL_EDGE)) / SCROLL_EDGE; // 0..1
      target = SCROLL_MAX * Math.pow(k, 1.5);                 // ease-in, slower start
    }

    const st = dragScrollRef.current;
    st.targetVy = target;

    // start loop only when needed
    if (!st.active && target !== 0) {
      st.active = true;
      st.raf = requestAnimationFrame(tickDragScroll);
    }
    // if we’re in the middle but pointer returned to safe zone, gently stop
    if (st.active && target === 0 && Math.abs(st.vy) < 0.2) {
      stopAutoScroll();
    }
  }

  function stopAutoScroll() {
    const st = dragScrollRef.current;
    st.targetVy = 0;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    st.vy = 0;
    st.active = false;
  }

  useEffect(() => {
    loadMapList();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10">

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-6 items-start">

        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Start/Stop */}
          <Card>
            <div className="p-6">
              <form onSubmit={onStart} className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="url">URL da Página</Label>
                  <input
                    id="url"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="https://exemplo.com/login.jsf"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 outline-none ring-0 focus:border-zinc-700"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Inclua o protocolo (http/https).</p>
                </div>

                <div>
                  <Label htmlFor="nome">Nome do Arquivo (sem prefixo)</Label>
                  <input
                    id="nome"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="ex: motorista"
                    value={nomeArquivo}
                    onChange={e => setNomeArquivo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 outline-none focus:border-zinc-700"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Geraremos <code className="mono">mapa_{nomeArquivo || 'nome'}.json</code>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    Iniciar Mapeamento
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onStop}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-2 font-medium text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                  >
                    Parar
                  </button>

                  <div className="min-h-[1.75rem] px-1 text-sm text-zinc-400">
                    {status}
                  </div>
                </div>
              </form>
            </div>
          </Card>

          {/* Map list */}
          <Card>
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Mapas salvos</h2>
                <button
                  onClick={loadMapList}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm hover:bg-zinc-800"
                >
                  Atualizar lista
                </button>
              </div>

              {/* loading state */}
              {Array.isArray(maps) && maps.length && maps[0]._loading ? (
                <div className="text-zinc-400 text-sm">Carregando…</div>
              ) : !maps?.length ? (
                <div className="text-zinc-400 text-sm">Nenhum mapa encontrado.</div>
              ) : (
                <ul className="space-y-2">
                  {maps.map((name) => (
                    <li key={name} className="flex items-center justify-between rounded-xl border border-zinc-800 px-3 py-2">
                      <span className="mono truncate">{name}</span>
                      <button
                        onClick={() => openMapGuard(name)}
                        disabled={selectedMapName === name}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-sm hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Abrir
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Map details */}
        <Card className="lg:col-span-2">
          <div className="relative p-6">
            {!selectedMap ? (
              <div className="text-zinc-400 text-sm">
                Selecione um mapa para visualizar e editar as <code>keys</code>.
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mono">{selectedMapName}</h3>
                  </div>
                  <button
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
                    onClick={() => {
                      if (isDirty && !confirm('Você tem alterações não salvas. Deseja descartá-las?')) return;
                      setSelectedMap(null);
                      setSelectedMapName(null);
                      setStepsDraft([]);
                      setDragOverIndex(null);
                      setDraggingIndex(null);
                    }}
                  >
                    Fechar painel
                  </button>
                </div>

                {/* Floating banners (no layout shift) */}
                <div className="pointer-events-none absolute right-4 top-4 z-10 space-y-2">
                  {dupInfo.total > 0 && (
                    <div className="pointer-events-auto rounded-xl border border-red-600/30 bg-red-900/70 backdrop-blur px-3 py-2 text-red-100 shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">
                          Existem <strong>{dupInfo.total}</strong> chaves duplicadas
                          {dupInfo.duplicates.length ? <> ({dupInfo.duplicates.slice(0, 3).map(d => d.key).join(', ')}{dupInfo.duplicates.length > 3 ? '…' : ''})</> : null}.
                        </div>
                        <button
                          onClick={fixDuplicateKeys}
                          className="rounded-lg border border-red-500/40 px-3 py-1 text-sm hover:bg-red-900/40"
                        >
                          Corrigir
                        </button>
                      </div>
                    </div>
                  )}

                  {isDirty && (
                    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-900/70 backdrop-blur px-3 py-2 text-amber-100 shadow-md">
                      <span className="text-sm">Há alterações não salvas.</span>
                      <button
                        onClick={onSaveKeys}
                        className="rounded-lg bg-amber-400/90 text-amber-950 px-3 py-1 text-sm hover:bg-amber-300"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setStepsDraft(assignIdsToSteps(selectedMap?.steps || []))}
                        className="rounded-lg border border-amber-500/40 px-3 py-1 text-sm hover:bg-amber-900/40"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>

                {/* Editor de steps + salvar */}
                <>
                  {/* Steps list (reorder + delete + inline key editing) */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-zinc-300">Steps</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newStep = {
                            __id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
                            action: 'click',
                            selector: '',
                            // description and key start empty
                          };
                          setStepsDraft(prev => [newStep, ...(prev || [])]);
                        }}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm hover:bg-zinc-800"
                      >
                        Adicionar
                      </button>
                    </div>

                    {(!stepsDraft || stepsDraft.length === 0) ? (
                      <div className="text-zinc-400 text-sm">Este mapa não possui steps.</div>
                    ) : (
                      <Reorder.Group axis="y" values={stepsDraft} onReorder={setStepsDraft} className="space-y-2">
                        {stepsDraft.map((st, idx) => (
                          <Reorder.Item
                            key={st.__id ?? idx}
                            value={st}
                            as="li"
                            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                            layout
                            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
                            whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
                            onMouseLeave={() => setOpenActionIdx(null)}
                            onDrag={handleDragAutoScroll}
                            onDragEnd={stopAutoScroll}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                {(() => {
                                  const { icon, classes } = actionMeta(st?.action);
                                  return (
                                    <>
                                      {/* first row: ACTION chip (click to change) + DESCRIPTION (click to edit) */}
                                      <div className="flex items-center gap-3 text-sm">
                                        {/* action chip opens dropdown */}
                                        <button
                                          type="button"
                                          onClick={() => setOpenActionIdx(openActionIdx === idx ? null : idx)}
                                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${classes}`}
                                        >
                                          <FontAwesomeIcon icon={icon} className="h-3 w-3" />
                                          {st?.action || '—'}
                                        </button>

                                        {/* description: click to edit → input */}
                                        {editingField.idx === idx && editingField.field === 'description' ? (
                                          <input
                                            autoFocus
                                            value={st?.description ?? ''}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setStepsDraft(prev => {
                                                const arr = prev.slice();
                                                arr[idx] = { ...(arr[idx] || {}), description: v.trim() === '' ? undefined : v };
                                                return arr;
                                              });
                                            }}
                                            onBlur={() => { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') {
                                                if (editSnapshot && editSnapshot.idx === idx && editSnapshot.field === 'description') {
                                                  const orig = editSnapshot.value;
                                                  setStepsDraft(prev => {
                                                    const arr = prev.slice();
                                                    arr[idx] = { ...(arr[idx] || {}), description: orig?.trim() ? orig : undefined };
                                                    return arr;
                                                  });
                                                }
                                                setEditingField({ idx: null, field: null });
                                                setEditSnapshot(null);
                                              }
                                              if (e.key === 'Enter') { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }
                                            }}
                                            className="w-full max-w-[520px] rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm"
                                            placeholder="descrição"
                                          />
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditSnapshot({ idx, field: 'description', value: st?.description ?? '' });
                                              setEditingField({ idx, field: 'description' });
                                            }}
                                            className="font-medium text-zinc-200 truncate hover:underline"
                                            title="Clique para editar"
                                          >
                                            {st?.description ? st.description : <span className="text-zinc-500">Adicionar descrição</span>}
                                          </button>
                                        )}

                                      </div>

                                      {/* ACTION dropdown (inline) */}
                                      {openActionIdx === idx && (
                                        <div className="relative">
                                          <div className="absolute z-10 mt-1 w-auto min-w-[140px] max-w-[180px] rounded-lg border border-zinc-800 bg-zinc-900/95 shadow-lg p-1">
                                            {ACTIONS.map(a => {
                                              const { icon: ai, classes: c } = actionMeta(a);
                                              const active = a === st?.action;
                                              return (
                                                <button
                                                  type="button"
                                                  key={a}
                                                  onClick={() => {
                                                    setStepsDraft(prev => {
                                                      const arr = prev.slice();
                                                      arr[idx] = { ...(arr[idx] || {}), action: a };
                                                      return arr;
                                                    });
                                                    setOpenActionIdx(null);
                                                  }}
                                                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800 ${active ? 'bg-zinc-800' : ''}`}
                                                >
                                                  <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-[2px] ${c}`}>
                                                    <FontAwesomeIcon icon={ai} className="h-2.5 w-2.5" />
                                                    {a}
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* second row: SELECTOR (left) + KEY (right) — click to edit */}
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* selector column */}
                                        <div>
                                          {editingField.idx === idx && editingField.field === 'selector' ? (
                                            <input
                                              autoFocus
                                              value={st?.selector ?? ''}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                setStepsDraft(prev => {
                                                  const arr = prev.slice();
                                                  arr[idx] = { ...(arr[idx] || {}), selector: v };
                                                  return arr;
                                                });
                                              }}
                                              onBlur={() => { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                  if (editSnapshot && editSnapshot.idx === idx && editSnapshot.field === 'selector') {
                                                    const orig = editSnapshot.value ?? '';
                                                    setStepsDraft(prev => {
                                                      const arr = prev.slice();
                                                      arr[idx] = { ...(arr[idx] || {}), selector: orig };
                                                      return arr;
                                                    });
                                                  }
                                                  setEditingField({ idx: null, field: null });
                                                  setEditSnapshot(null);
                                                }
                                                if (e.key === 'Enter') { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }
                                              }}
                                              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm text-white"
                                              placeholder='ex: [name="formCad:nome"]'
                                            />
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditSnapshot({ idx, field: 'selector', value: st?.selector ?? '' });
                                                setEditingField({ idx, field: 'selector' });
                                              }}
                                              className="block w-full rounded-lg border border-transparent bg-zinc-900/40 px-2 py-1 text-left text-sm text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors"
                                              title="Clique para editar selector"
                                            >
                                              {st?.selector || <span className="text-zinc-500">Adicionar selector</span>}
                                            </button>
                                          )}
                                        </div>

                                        {/* key column */}
                                        <div>
                                          {editingField.idx === idx && editingField.field === 'key' ? (
                                            <input
                                              autoFocus
                                              value={st?.key ?? ''}
                                              onChange={(e) => {
                                                const raw = e.target.value;
                                                const v = raw.trim();
                                                setStepsDraft(prev => {
                                                  const arr = prev.slice();
                                                  arr[idx] = { ...(arr[idx] || {}), key: v === '' ? undefined : v };
                                                  return arr;
                                                });
                                              }}
                                              onBlur={() => { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                  if (editSnapshot && editSnapshot.idx === idx && editSnapshot.field === 'key') {
                                                    const orig = editSnapshot.value ?? '';
                                                    setStepsDraft(prev => {
                                                      const arr = prev.slice();
                                                      arr[idx] = { ...(arr[idx] || {}), key: String(orig).trim() === '' ? undefined : orig };
                                                      return arr;
                                                    });
                                                  }
                                                  setEditingField({ idx: null, field: null });
                                                  setEditSnapshot(null);
                                                }
                                                if (e.key === 'Enter') { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }
                                              }}
                                              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm"
                                              placeholder="key"
                                            />
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditSnapshot({ idx, field: 'key', value: st?.key ?? '' });
                                                setEditingField({ idx, field: 'key' });
                                              }}
                                              className="block w-full rounded-lg border border-transparent bg-zinc-900/40 px-2 py-1 text-left text-sm text-zinc-300 hover:border-zinc-700"
                                              title="Clique para editar key"
                                            >
                                              {typeof st?.key === 'string' && st.key.trim() !== '' ? (
                                                st.key
                                              ) : (
                                                <span className="text-zinc-500">Adicionar key</span>
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* index label */}
                                <span className="text-xs text-zinc-500">#{idx + 1}</span>

                                <button
                                  onClick={() => onDeleteStep(idx)}
                                  className="grid h-6 w-6 place-items-center rounded-md border border-red-600/40 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                                  type="button"
                                  title="Remover step"
                                  aria-label="Remover step"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="h-2 w-2" />
                                </button>

                              </div>

                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>

                    )}
                  </div>
                </>

              </>
            )}
          </div>
        </Card>

      </div>
    </main >
  );
}
