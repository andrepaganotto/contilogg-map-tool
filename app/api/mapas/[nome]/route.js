export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { readMap, safeName } from '../../../../lib/mapStore.js'; // keep your existing path

export async function GET(req, ctx) {
  try {
    const { nome } = await ctx.params; // 👈 Next 15: params is a Promise
    const safe = safeName(nome);

    if (!safe.toLowerCase().endsWith('.json')) {
      return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
    }

    const mapa = await readMap(safe);
    if (!mapa) return NextResponse.json({ erro: 'Mapa não encontrado' }, { status: 404 });
    return NextResponse.json(mapa);
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
