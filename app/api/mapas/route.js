export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { listMaps } from '../../../lib/mapStore.js';

export async function GET() {
    try {
        const mapas = await listMaps();
        return NextResponse.json({ mapas });
    } catch (e) {
        return NextResponse.json({ erro: e.message }, { status: 500 });
    }
}
