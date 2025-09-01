'use client';

export function assignIdsToSteps(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((s, i) => ({
        __id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${i}`),
        __origKey: (typeof s?.key === 'string' ? s.key : undefined),
        ...s,
    }));
}

export function stripStepIds(arr) {
    return (Array.isArray(arr) ? arr : []).map(({ __id, __origKey, ...rest }) => rest);
}
