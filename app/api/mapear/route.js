// app/api/mapear/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import path from 'path';
import { MAP_DIR, ensureMapDir, buildOutputName } from '../../../lib/mapStore.js';

async function getMapear() {
    // one true instance of your original module, shared across requests
    if (!globalThis.__MAPEAR_SINGLETON__) {
        globalThis.__MAPEAR_SINGLETON__ = (await import('../../../mapear.js')).default;
    }
    return globalThis.__MAPEAR_SINGLETON__;
}

// POST /api/mapear  → start (no operacao/categoria anymore)
export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const { url, nomeArquivo } = body || {};

        if (!url || !nomeArquivo) {
            return NextResponse.json(
                { erro: 'Parâmetros insuficientes: envie url e nomeArquivo.' },
                { status: 400 }
            );
        }

        ensureMapDir();
        const outName = buildOutputName(nomeArquivo);
        const outPath = path.join(MAP_DIR, outName);

        const mapear = await getMapear();
        await mapear.start(url, outPath); // ← only (url, outputFile)

        return NextResponse.json({
            mensagem: 'Mapeamento iniciado. Use /api/stop para finalizar.',
            arquivo: outName
        });
    } catch (e) {
        return NextResponse.json({ erro: e.message }, { status: 500 });
    }
}

// DELETE /api/mapear  → stop
export async function DELETE() {
    return stopHandler();
}

// Exported so /api/stop can reuse the exact same logic/module instance
export async function stopHandler() {
    const mapear = await getMapear();
    try {
        await mapear.stop(); // writes the JSON and closes the browser
        return NextResponse.json({ mensagem: 'Mapeamento finalizado.' });
    } catch (e) {
        const msg = String(e?.message || '');
        // Surface the "no session" condition as 409 (same as old server)
        const isNoRun = msg.includes('Nenhum mapeamento em andamento');
        return NextResponse.json({ erro: msg }, { status: isNoRun ? 409 : 500 });
    }
}
