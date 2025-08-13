export default function StatusBar({ status }) {
    if (!status) return null
    const tone = status.startsWith('Erro') ? 'badge-amber' : status.includes('finalizado') ? 'badge-green' : 'badge-slate'
    return (
        <div className={`badge ${tone}`}>{status}</div>
    )
}