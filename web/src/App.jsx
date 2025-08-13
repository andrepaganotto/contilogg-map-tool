import { useEffect, useMemo, useState } from 'react'
import { API } from './lib/api'
import StatusBar from './components/StatusBar'
import MapForm from './components/MapForm'
import MapList from './components/MapList'
import MapPanel from './components/MapPanel'

export default function App() {
    const [status, setStatus] = useState('Idle')
    const [running, setRunning] = useState(false)
    const [maps, setMaps] = useState([])
    const [selected, setSelected] = useState(null) // file name string
    const [selectedDataKeys, setSelectedDataKeys] = useState([]) // keys from uploaded JSON
    const [loadingMaps, setLoadingMaps] = useState(false)

    async function refreshList() {
        setLoadingMaps(true)
        try {
            const res = await API.listMaps()
            setMaps(res.mapas || [])
        } catch (e) {
            setStatus(`Erro: ${e.message}`)
        } finally {
            setLoadingMaps(false)
        }
    }

    async function handleStart({ url, nomeArquivo, operacao }) {
        setStatus('Iniciando mapeamento…')
        try {
            await API.startMap({ url, nomeArquivo, operacao, categoria: nomeArquivo })
            setRunning(true)
            setStatus('Mapeando…')
        } catch (e) {
            setStatus(`Erro: ${e.message}`)
        }
    }

    async function handleStop() {
        setStatus('Parando mapeamento…')
        try {
            await API.stopMap()
            setRunning(false)
            setStatus('Mapeamento finalizado.')
            await refreshList()
        } catch (e) {
            setStatus(`Erro: ${e.message}`)
        }
    }

    useEffect(() => { refreshList() }, [])

    const currentOpen = useMemo(() => selected, [selected])

    return (
        <div className="mx-auto max-w-6xl p-4 space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">Interaction Map Tool</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <div className="card p-4 space-y-4">
                        <MapForm onStart={handleStart} onStop={handleStop} running={running} />
                        <StatusBar status={status} />
                    </div>

                    <div className="card p-4">
                        <MapList
                            items={maps}
                            loading={loadingMaps}
                            onRefresh={refreshList}
                            opened={currentOpen}
                            onOpen={setSelected}
                        />
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <MapPanel
                        fileName={selected}
                        onClose={() => { setSelected(null); setSelectedDataKeys([]) }}
                        onSetDataKeys={setSelectedDataKeys}
                        dataKeys={selectedDataKeys}
                    />
                </div>
            </div>
        </div>
    )
}