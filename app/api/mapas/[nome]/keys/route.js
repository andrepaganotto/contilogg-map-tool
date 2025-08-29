export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { readMap, writeMap, safeName } from '../../../../../lib/mapStore.js';

export async function POST(req, ctx) {
  try {
    const { nome } = await ctx.params;
    if (!nome.toLowerCase().endsWith('.json')) {
      return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { mapping, steps } = body || {};

    if (!mapping && !Array.isArray(steps)) {
      return NextResponse.json({ erro: 'Envie "mapping" e/ou "steps".' }, { status: 400 });
    }

    const file = safeName(nome);
    const mapa = await readMap(file);
    if (!mapa) return NextResponse.json({ erro: 'Mapa não encontrado' }, { status: 404 });

    // If client sent a new steps array (reorder/delete), replace it
    if (Array.isArray(steps)) {
      mapa.steps = steps;
    }

    // Apply key remaps if provided
    if (mapping && typeof mapping === 'object' && Array.isArray(mapa.steps)) {
      for (const step of mapa.steps) {
        if (step && typeof step === 'object' && typeof step.key === 'string') {
          const oldK = step.key;
          if (Object.prototype.hasOwnProperty.call(mapping, oldK)) {
            const newK = mapping[oldK];
            if (typeof newK === 'string' && newK.trim() !== '') {
              step.key = newK;
            }
          }
        }
      }
    }

    await writeMap(file, mapa);
    return NextResponse.json({ ok: true, mensagem: 'Mapa atualizado com sucesso.', mapaAtualizado: mapa });
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
