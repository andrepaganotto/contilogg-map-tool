const BASE = import.meta.env.VITE_API_BASE || window.location.origin

async function json(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `${method} ${path} failed`)
    }
    return res.headers.get('content-type')?.includes('application/json')
        ? res.json()
        : res.text()
}

export const API = {
    startMap: (payload) => json('POST', '/mapear', payload),
    stopMap: () => json('POST', '/stop'),
    listMaps: () => json('GET', '/mapas'),
    getMap: (name) => json('GET', `/mapas/${encodeURIComponent(name)}`),
    saveKeys: (name, mapping) => json('POST', `/mapas/${encodeURIComponent(name)}/keys`, { mapping }),
}