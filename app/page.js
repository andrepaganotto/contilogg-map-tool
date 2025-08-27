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
  const [operacao, setOperacao] = useState('consultar');
  const [nomeArquivo, setNomeArquivo] = useState('');

  // app state
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedMapName, setSelectedMapName] = useState(null);

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
        body: JSON.stringify({ url, nomeArquivo, operacao, categoria: nomeArquivo }),
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
    if (!selectedMapName || !selectedMap) return;

    // collect mapping (oldKey -> newKey) from table inputs
    const rows = document.querySelectorAll('[data-key-row="1"]');
    const mapping = {};
    rows.forEach(row => {
      const from = row.getAttribute('data-from') || '';
      const inp = row.querySelector('input[type="text"]');
      const to = inp?.value || '';
      if (from && to && from !== to) mapping[from] = to;
    });

    if (!Object.keys(mapping).length) {
      setStatus('Nenhuma alteração detectada.');
      return;
    }

    setBusy(true);
    setStatus('Salvando…');
    try {
      const r = await fetch(`/api/mapas/${encodeURIComponent(selectedMapName)}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || 'Falha ao salvar');
      setStatus('Salvo com sucesso.');
      await openMap(selectedMapName); // refresh
    } catch (e) {
      setStatus('Erro ao salvar: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadMapList();
  }, []);

  // Build rows with editable keys (only steps that have "key")
  const keyRows = useMemo(() => {
    const steps = Array.isArray(selectedMap?.steps) ? selectedMap.steps : [];
    return steps
      .map((s, idx) => ({ idx, s }))
      .filter(({ s }) => typeof s?.key === 'string');
  }, [selectedMap]);

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

              <div className="md:col-span-3">
                <Label htmlFor="operacao">Operação</Label>
                <select
                  id="operacao"
                  value={operacao}
                  onChange={e => setOperacao(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 outline-none focus:border-zinc-700"
                >
                  <option value="consultar">Consultar</option>
                  <option value="cadastrar">Cadastrar</option>
                  <option value="baixar">Baixar</option>
                  <option value="editar">Editar</option>
                </select>
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
                    <div className="text-sm text-zinc-400">
                      Operação:{' '}
                      <span className="inline-flex items-center rounded-md border border-cyan-700/40 bg-cyan-900/20 px-2 py-0.5 text-cyan-300">
                        {selectedMap?.operacao || '(não definido)'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
                    onClick={() => {
                      setSelectedMap(null);
                      setSelectedMapName(null);
                      setDataJson(null);
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

                {/* Editable keys table */}
                {keyRows.length === 0 ? (
                  <div className="text-zinc-400 text-sm">Este mapa não possui steps com <code>key</code>.</div>
                ) : (
                  <>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-300">
                      Steps com <code>key</code> no mapa
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-zinc-800">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900/70 text-zinc-300">
                          <tr>
                            <th className="px-3 py-2 text-left">Key no mapa</th>
                            <th className="px-3 py-2 text-left">Key no mapa (editável)</th>
                            <th className="px-3 py-2 text-left">Escolher do JSON</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keyRows.map(({ s }, i) => {
                            const original = s.key || '';
                            return (
                              <tr key={i} data-key-row="1" data-from={original} className="odd:bg-zinc-900/40">
                                <td className="px-3 py-2 text-zinc-300 mono">{original}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    defaultValue={original}
                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  {dataKeys.length ? (
                                    <select
                                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const input = e.currentTarget.closest('tr')?.querySelector('input[type="text"]');
                                        if (val && input) input.value = val;
                                      }}
                                    >
                                      <option value="">(manter/editar manualmente)</option>
                                      {dataKeys.map(k => (
                                        <option key={k} value={k}>{k}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-zinc-500">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
