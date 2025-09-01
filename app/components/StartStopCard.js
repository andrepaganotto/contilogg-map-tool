'use client';
import Card from './ui/Card';
import Label from './ui/Label';

export default function StartStopCard({
    url, setUrl,
    nomeArquivo, setNomeArquivo,
    busy, status,
    onStart, onStop,
}) {
    return (
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
    );
}
