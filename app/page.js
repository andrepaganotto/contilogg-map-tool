'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

  // local JSON (data file) used just for showing keys & easy remap
  const [dataJson, setDataJson] = useState(null);
  const fileInputRef = useRef(null);

  // derived keys
  const dataKeys = useMemo(() => (dataJson ? Object.keys(dataJson) : []), [dataJson]);

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
    setDataJson(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const r = await fetch(`/api/mapas/${encodeURIComponent(name)}`);
      if (!r.ok) throw new Error('Falha ao carregar mapa');
      const m = await r.json();

      setSelectedMap(m);
      setSelectedMapName(name);
      setStepsDraft(Array.isArray(m.steps) ? m.steps : []);
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

  function onPickDataJson(file) {
    if (!file) return;
    file.text()
      .then(txt => {
        try {
          const parsed = JSON.parse(txt);
          setDataJson(parsed);
        } catch (e) {
          alert('JSON inválido: ' + e.message);
        }
      });
  }

  async function onSaveKeys() {
    if (!selectedMapName) return;

    // Compare original vs draft to detect any change (order, deletions, key edits, etc.)
    const originalSteps = Array.isArray(selectedMap?.steps) ? selectedMap.steps : [];
    const draftSteps = Array.isArray(stepsDraft) ? stepsDraft : [];
    const changed = JSON.stringify(originalSteps) !== JSON.stringify(draftSteps);

    if (!changed) {
      setStatus('Nenhuma alteração detectada.');
      return;
    }

    setBusy(true);
    setStatus('Salvando…');
    try {
      // Optional: compute a mapping for legacy logic (not required because we send full steps)
      // You can leave it empty—server will replace steps entirely.
      const mapping = {};

      const r = await fetch(`/api/mapas/${encodeURIComponent(selectedMapName)}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: draftSteps, mapping }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || 'Falha ao salvar');

      setStatus('Salvo com sucesso.');
      await openMap(selectedMapName); // refresh view from disk
    } catch (e) {
      setStatus('Erro ao salvar: ' + e.message);
    } finally {
      setBusy(false);
    }
  }


  // --- Drag n Drop + Delete for steps + inline key editing ---
  const dragIndexRef = useRef(null);

  function onDragStartStep(index) {
    dragIndexRef.current = index;
    setDraggingIndex(index);
  }

  function onDragOverStep(e, index) {
    e.preventDefault(); // allow drop
    if (dragOverIndex !== index) setDragOverIndex(index);
  }

  function onDropStep(targetIndex) {
    const from = dragIndexRef.current;
    if (from === null) return;
    setDragOverIndex(null);
    setDraggingIndex(null);
    if (from === targetIndex) return;

    setStepsDraft(prev => {
      const arr = prev.slice();
      const [moved] = arr.splice(from, 1);
      arr.splice(targetIndex, 0, moved);
      return arr;
    });
    dragIndexRef.current = null;
  }

  function onDragEndStep() {
    setDragOverIndex(null);
    setDraggingIndex(null);
  }

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

  useEffect(() => {
    loadMapList();
  }, []);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Mapeador de Página
          </h1>
          <button
            onClick={loadMapList}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Atualizar lista
          </button>
        </div>
        <p className="mt-2 text-zinc-400">
          Inicie, pare e edite seus mapas com uma interface mais elegante.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Start/Stop */}
        <Card className="lg:col-span-3">
          <div className="p-6">
            <form onSubmit={onStart} className="grid md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <Label htmlFor="url">URL da Página</Label>
                <input
                  id="url"
                  type="text"
                  required
                  placeholder="https://exemplo.com/login.jsf"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 outline-none ring-0 focus:border-zinc-700"
                />
              </div>

              <div className="md:col-span-4">
                <Label htmlFor="nome">Nome do Arquivo (sem prefixo)</Label>
                <input
                  id="nome"
                  type="text"
                  required
                  placeholder="ex: motorista"
                  value={nomeArquivo}
                  onChange={e => setNomeArquivo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="md:col-span-12 flex flex-wrap gap-3 pt-1">
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
        <Card className="lg:col-span-1">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Mapas salvos</h2>
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
                      onClick={() => openMap(name)}
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

        {/* Map details */}
        <Card className="lg:col-span-2">
          <div className="p-6">
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
                      setSelectedMap(null);
                      setSelectedMapName(null);
                      setDataJson(null);
                      setStepsDraft([]);
                      setDragOverIndex(null);
                      setDraggingIndex(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Fechar painel
                  </button>
                </div>


                {/* Upload JSON of data to assist mapping */}
                <div className="mb-4">
                  <Label htmlFor="arquivoDados">JSON de dados para esse mapa (opcional)</Label>
                  <input
                    id="arquivoDados"
                    type="file"
                    accept=".json,application/json"
                    ref={fileInputRef}
                    onChange={(e) => onPickDataJson(e.target.files?.[0])}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 file:mr-3 file:rounded-lg file:border file:border-zinc-700 file:bg-zinc-800 file:px-3 file:py-1 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
                  />
                  {dataKeys.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-zinc-300 font-medium">Chaves presentes no JSON:</div>
                      <div className="json-keys mt-2">
                        {dataKeys.map(k => (
                          <span key={k} className="rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs mono">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Editor de steps + salvar */}
                <>
                  {/* Steps list (reorder + delete + inline key editing) */}
                  <div className="mb-6">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-300">Steps</h4>
                    {(!stepsDraft || stepsDraft.length === 0) ? (
                      <div className="text-zinc-400 text-sm">Este mapa não possui steps.</div>
                    ) : (
                      <ul className="space-y-2">
                        {stepsDraft.map((st, idx) => (
                          <li
                            key={idx}
                            draggable
                            onDragStart={() => onDragStartStep(idx)}
                            onDragOver={(e) => onDragOverStep(e, idx)}
                            onDrop={() => onDropStep(idx)}
                            onDragEnd={onDragEndStep}
                            className={[
                              "rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2",
                              "transition-transform duration-150 ease-out",
                              draggingIndex === idx ? "opacity-80 scale-[0.99] cursor-grabbing" : "cursor-grab",
                            ].join(" ")}
                          >
                            {/* animated spacer to "open space" when dragging over this item */}
                            <div
                              aria-hidden
                              className="overflow-hidden"
                              style={{ height: dragOverIndex === idx ? 12 : 0, transition: 'height 150ms' }}
                            />

                            {/* row content */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-zinc-200 text-sm mono truncate">
                                  {st?.action || '(sem ação)'}
                                  <span className="text-zinc-500"> · </span>
                                  <span className="text-zinc-400">{st?.selector || '(sem seletor)'}</span>
                                </div>

                                {/* inline key editor (only when key exists) */}
                                {typeof st?.key === 'string' && (
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={st.key}
                                      onChange={(e) => onEditStepKey(idx, e.target.value)}
                                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm"
                                      placeholder="key"
                                    />
                                    {dataKeys.length ? (
                                      <select
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm"
                                        onChange={(e) => onEditStepKey(idx, e.target.value)}
                                        value={st.key}
                                      >
                                        <option value={st.key || ''}>(manter/editar manualmente)</option>
                                        {dataKeys.map(k => (
                                          <option key={k} value={k}>{k}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <div className="text-xs text-zinc-500 self-center">(sem JSON de dados carregado)</div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-zinc-500">#{idx + 1}</span>
                                <button
                                  onClick={() => onDeleteStep(idx)}
                                  className="rounded-md border border-red-600/40 bg-red-900/30 px-2 py-1 text-xs text-red-300 hover:bg-red-900/50"
                                  type="button"
                                  title="Remover step"
                                >
                                  Remover
                                </button>
                                <span
                                  className="select-none text-zinc-500"
                                  title="Arraste para reordenar"
                                  aria-hidden
                                >
                                  ⠿
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={onSaveKeys}
                      disabled={busy}
                      className="rounded-xl bg-cyan-500/90 px-4 py-2 font-medium text-cyan-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      Salvar alterações no mapa
                    </button>
                  </div>
                </>

              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
