import { useMemo, useState } from 'react'
import { isValidHttpUrl } from '../utils/validators'

const OPS = [
    { value: 'consultar', label: 'consultar' },
    { value: 'cadastrar', label: 'cadastrar' },
    { value: 'baixar', label: 'baixar' },
    { value: 'editar', label: 'editar' },
]

export default function MapForm({ onStart, onStop, running }) {
    const [url, setUrl] = useState('')
    const [nome, setNome] = useState('')
    const [operacao, setOperacao] = useState('consultar')
    const valid = useMemo(() => isValidHttpUrl(url) && nome.trim().length > 0, [url, nome])

    function submit(e) {
        e.preventDefault()
        if (!valid || running) return
        onStart({ url: url.trim(), nomeArquivo: nome.trim(), operacao })
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="label">URL da Página</label>
                    <input className="input" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
                </div>
                <div>
                    <label className="label">Operação</label>
                    <select className="input" value={operacao} onChange={e => setOperacao(e.target.value)}>
                        {OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="label">Nome do Arquivo (sem prefixo)</label>
                    <input className="input" placeholder="ex: motorista" value={nome} onChange={e => setNome(e.target.value)} />
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button type="submit" className="btn btn-primary" disabled={!valid || running}>Iniciar Mapeamento</button>
                <button type="button" className="btn btn-muted" onClick={onStop} disabled={!running}>Parar</button>
            </div>
        </form>
    )
}