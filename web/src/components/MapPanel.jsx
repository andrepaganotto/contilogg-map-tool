import { useEffect, useMemo, useState } from 'react'
import { API } from '../lib/api'

function KeyRow({ original, value, onEdit, dataKeys }) {
    return (
        <tr className="border-b">
            <td className="p-2 font-mono text-xs text-slate-700">{original}</td>
            <td className="p-2">
                <input className="input" value={value} onChange={e => onEdit(e.target.value)} />
            </td>
            <td className="p-2">
                {dataKeys?.length > 0 ? (
                    <select className="input" onChange={e => onEdit(e.target.value)} defaultValue="">
                        <option value="" disabled>Escolher do JSON…</option>
                        {dataKeys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                ) : (
                    <span className="text-xs text-slate-500">Carregue um JSON de dados</span>
                )}
            </td>
        </tr>
    )
}

export default function MapPanel({ fileName, onClose, dataKeys, onSetDataKeys }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [map, setMap] = useState(null) // loaded JSON
    const [edit, setEdit] = useState({}) // key -> newValue
    const hasStepsWithKey = useMemo(() => Array.isArray(map?.steps) && map.steps.some(s => typeof s.key === 'string' && s.key.length > 0), [map])

    useEffect(() => {
        if (!fileName) return
        setLoading(true)
        setError('')
        API.getMap(fileName)
            .then(setMap)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [fileName])

    function onUploadJson(e) {
        const f = e.target.files?.[0]
        if (!f) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const json = JSON.parse(String(reader.result || '{}'))
                const keys = Object.keys(json || {})
                onSetDataKeys(keys)
            } catch (err) {
                onSetDataKeys([])
            }
        }
        reader.readAsText(f)
    }

    function setKeyEdit(oldKey, newVal) {
        setEdit(prev => ({ ...prev, [oldKey]: newVal }))
    }

    async function save() {
        if (!map || !fileName) return
        const mapping = {}
        for (const s of map.steps || []) {
            if (s?.key && typeof edit[s.key] === 'string' && edit[s.key].trim() && edit[s.key] !== s.key) {
                mapping[s.key] = edit[s.key].trim()
            }
        }
        if (Object.keys(mapping).length === 0) {
            alert('Nenhuma alteração detectada.')
            return
        }
        try {
            await API.saveKeys(fileName, mapping)
            // reload to reflect changes
            const updated = await API.getMap(fileName)
            setMap(updated)
            setEdit({})
        } catch (e) {
            setError(String(e.message))
        }
    }

    if (!fileName) return (
        <div className="card p-4">
            <p className="text-sm text-slate-500">Selecione um mapa para editar.</p>
        </div>
    )

    return (
        <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-slate-500">Arquivo</div>
                    <div className="font-mono text-sm">{fileName}</div>
                </div>
                <div className="flex items-center gap-2">
                    {map?.operacao && <span className="badge badge-blue">{map.operacao}</span>}
                    <button className="btn btn-muted" onClick={onClose}>Cancelar</button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="label">JSON de dados (opcional)</label>
                <input type="file" accept="application/json,.json" className="input" onChange={onUploadJson} />
                {Array.isArray(dataKeys) && dataKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {dataKeys.map(k => <span key={k} className="badge badge-slate">{k}</span>)}
                    </div>
                )}
            </div>

            {loading && <div className="badge badge-slate">Carregando…</div>}
            {error && <div className="badge badge-amber">Erro: {error}</div>}

            {hasStepsWithKey ? (
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="p-2 w-1/3">Key no mapa</th>
                                <th className="p-2 w-1/3">Key no mapa (editável)</th>
                                <th className="p-2 w-1/3">Escolher do JSON</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(map?.steps || []).filter(s => typeof s.key === 'string' && s.key.length > 0).map(s => {
                                const val = edit[s.key] ?? s.key
                                return (
                                    <KeyRow
                                        key={`${s.selector}-${s.key}`}
                                        original={s.key}
                                        value={val}
                                        onEdit={(v) => setKeyEdit(s.key, v)}
                                        dataKeys={dataKeys}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-sm text-slate-500">Nenhum step com key para editar.</div>
            )}

            <div className="flex gap-2">
                <button className="btn btn-primary" onClick={save}>Salvar alterações no mapa</button>
            </div>
        </div>
    )
}