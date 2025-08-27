import fs from 'fs';
import path from 'path';

export const MAP_DIR = path.resolve(process.cwd(), 'mapas');

export function ensureMapDir() {
    fs.mkdirSync(MAP_DIR, { recursive: true });
}

export function safeName(name) {
    // strip any path bits for safety
    return path.basename(name);
}

export async function listMaps() {
    ensureMapDir();
    const files = await fs.promises.readdir(MAP_DIR);
    return files
        .filter(f => f.toLowerCase().endsWith('.json'))
        .sort();
}

export async function readMap(fileName) {
    ensureMapDir();
    const safe = safeName(fileName);
    const full = path.join(MAP_DIR, safe);
    if (!fs.existsSync(full)) return null;
    const raw = await fs.promises.readFile(full, 'utf8');
    return JSON.parse(raw);
}

export async function writeMap(fileName, data) {
    ensureMapDir();
    const safe = safeName(fileName);
    const full = path.join(MAP_DIR, safe);
    await fs.promises.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
    return full;
}

export function buildOutputName(operacao, categoria) {
    const cap = (s) => (s && s[0] ? s[0].toUpperCase() + s.slice(1) : '');
    // mirrors your previous naming convention:
    // mapa_<operacao><CategoriaCapitalizada>.json
    return `mapa_${operacao}${cap(categoria)}.json`;
}
