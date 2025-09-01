'use client';
import Card from './ui/Card';

export default function MapListCard({ maps, selectedMapName, openMapGuard, loadMapList }) {
    return (
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
    );
}
