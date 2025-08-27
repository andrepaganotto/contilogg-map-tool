export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { readMap, writeMap, safeName } from '../../../../../lib/mapStore.js'; // keep your existing path

export async function POST(req, ctx) {
  try {
    const { nome } = await ctx.params; // 👈 await here too
    if (!nome.toLowerCase().endsWith('.json')) {
      return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
    }

    const { mapping } = await req.json();
    if (!mapping || typeof mapping !== 'object') {
      return NextResponse.json({ erro: 'Envie "mapping" como objeto { oldKey: newKey }' }, { status: 400 });
    }

    const mapa = await readMap(safeName(nome));
    if (!mapa) return NextResponse.json({ erro: 'Mapa não encontrado' }, { status: 404 });

    if (Array.isArray(mapa.steps)) {
      for (const step of mapa.steps) {
        if (step && typeof step === 'object' && typeof step.key === 'string') {
          const oldK = step.key;
          if (Object.prototype.hasOwnProperty.call(mapping, oldK)) {
            const newK = mapping[oldK];
            if (typeof newK === 'string' && newK.trim() !== '') step.key = newK;
          }
        }
      }
    }

    await writeMap(safeName(nome), mapa);
    return NextResponse.json({ ok: true, mensagem: 'Keys atualizadas com sucesso.', mapaAtualizado: mapa });
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
