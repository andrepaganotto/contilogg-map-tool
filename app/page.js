'use client';

import { useEffect, useMemo, useState } from 'react';

import StartStopCard from './components/StartStopCard.js';
import MapListCard from './components/MapListCard.js';
import MapEditorCard from './components/MapEditorCard.js';

import { assignIdsToSteps, stripStepIds } from '../lib/steps';

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

  function closeEditor() {
    if (isDirty && !confirm('Você tem alterações não salvas. Deseja descartá-las?')) return;
    setSelectedMap(null);
    setSelectedMapName(null);
    setStepsDraft([]);
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
      {/* Grid: left column (Start/Stop + Map list) and right column (Editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-6 items-start">

        {/* Left column: Start/Stop + Map list */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <StartStopCard
            url={url}
            setUrl={setUrl}
            nomeArquivo={nomeArquivo}
            setNomeArquivo={setNomeArquivo}
            busy={busy}
            status={status}
            onStart={onStart}
            onStop={onStop}
          />

          <MapListCard
            maps={maps}
            selectedMapName={selectedMapName}
            openMapGuard={openMapGuard}
            loadMapList={loadMapList}
          />
        </div>

        {/* Right column: Map editor */}
        <div className="lg:col-span-2">
          <MapEditorCard
            selectedMap={selectedMap}
            selectedMapName={selectedMapName}
            isDirty={isDirty}
            onSaveKeys={onSaveKeys}
            onClose={closeEditor}
            stepsDraft={stepsDraft}
            setStepsDraft={setStepsDraft}
            dupInfo={dupInfo}
            fixDuplicateKeys={fixDuplicateKeys}
            assignIdsToSteps={assignIdsToSteps}
          />
        </div>
      </div>
    </main>
  );
}
