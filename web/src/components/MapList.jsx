import { useEffect, useState } from 'react'
import { API } from '../lib/api'

export default function MapList({ items, loading, onRefresh, onOpen, opened }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Mapas salvos</h2>
                <button className="btn btn-muted" onClick={onRefresh} disabled={loading}>{loading ? 'Carregando…' : 'Atualizar lista'}</button>
            </div>
            <ul className="divide-y divide-slate-200">
                {items.length === 0 && (
                    <li className="py-6 text-sm text-slate-500">Nenhum mapa encontrado.</li>
                )}
                {items.map(name => (
                    <li key={name} className="py-3 flex items-center justify-between">
                        <span className="font-mono text-sm">{name}</span>
                        <button className="btn btn-primary" onClick={() => onOpen(name)} disabled={opened === name}>Abrir</button>
                    </li>
                ))}
            </ul>
        </div>
    )
}