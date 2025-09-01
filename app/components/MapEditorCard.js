'use client';
import Card from './ui/Card.js';
import StepsList from './steps/StepsList.js';

export default function MapEditorCard({
    selectedMap,
    selectedMapName,
    isDirty,
    onSaveKeys,
    onClose,
    stepsDraft,
    setStepsDraft,
    dupInfo,
    fixDuplicateKeys,
    assignIdsToSteps,
}) {
    return (
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
                                onClick={onClose}
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

                        {/* Steps */}
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
                                        };
                                        setStepsDraft(prev => [newStep, ...(prev || [])]);
                                    }}
                                    className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm hover:bg-zinc-800"
                                >
                                    Adicionar
                                </button>
                            </div>

                            <StepsList stepsDraft={stepsDraft} setStepsDraft={setStepsDraft} />
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}
