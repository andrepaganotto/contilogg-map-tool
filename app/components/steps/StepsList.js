'use client';
import { useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ACTIONS, actionMeta, ACTION_CONFIGS } from '../../../lib/actions.js';
import { FIELD_PRESETS } from '../../../lib/fieldPresets';

export default function StepsList({ stepsDraft, setStepsDraft }) {
    // Inline editing state
    const [openActionIdx, setOpenActionIdx] = useState(null);
    const [editingField, setEditingField] = useState({ idx: null, field: null });
    const [editSnapshot, setEditSnapshot] = useState(null);

    // Auto-scroll (smooth, bidirectional)
    const SCROLL_EDGE = 120, SCROLL_MAX = 8, SCROLL_EASE = 0.12;
    const dragScrollRef = useRef({ raf: 0, vy: 0, targetVy: 0, active: false });
    function tickDragScroll() {
        const st = dragScrollRef.current;
        st.vy = st.vy + (st.targetVy - st.vy) * SCROLL_EASE;
        if (Math.abs(st.vy) < 0.1 && Math.abs(st.targetVy) < 0.1) {
            st.active = false; st.vy = 0; st.targetVy = 0;
            if (st.raf) cancelAnimationFrame(st.raf);
            st.raf = 0; return;
        }
        window.scrollBy(0, st.vy);
        st.raf = requestAnimationFrame(tickDragScroll);
    }
    function handleDragAutoScroll(_event, info) {
        const yPage = info?.point?.y;
        if (typeof yPage !== 'number') return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const clientY = yPage - scrollTop;
        const vh = window.innerHeight || 0;
        let target = 0;
        if (clientY < SCROLL_EDGE) {
            const k = (SCROLL_EDGE - clientY) / SCROLL_EDGE;
            target = -SCROLL_MAX * Math.pow(k, 1.5);
        } else if (clientY > vh - SCROLL_EDGE) {
            const k = (clientY - (vh - SCROLL_EDGE)) / SCROLL_EDGE;
            target = SCROLL_MAX * Math.pow(k, 1.5);
        }
        const st = dragScrollRef.current;
        st.targetVy = target;
        if (!st.active && target !== 0) { st.active = true; st.raf = requestAnimationFrame(tickDragScroll); }
        if (st.active && target === 0 && Math.abs(st.vy) < 0.2) stopAutoScroll();
    }
    function stopAutoScroll() {
        const st = dragScrollRef.current;
        st.targetVy = 0;
        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = 0; st.vy = 0; st.active = false;
    }

    function onDeleteStep(index) {
        setStepsDraft(prev => prev.filter((_, i) => i !== index));
    }

    function pruneFieldsForAction(prevStep, newAction) {
        const cfg = ACTION_CONFIGS[newAction];
        const keepAlways = new Set(['action', 'description', '__id', '__origKey', 'meta']);

        // All field names we consider “editable fields” (from presets)
        const knownFields = new Set(Object.keys(FIELD_PRESETS)); // e.g., selector, field, key, time, description...

        // Build allowed set from config
        const allowed = new Set((cfg?.fields || []).map(f => f.name));

        // Start from previous step; change action
        const next = { ...(prevStep || {}), action: newAction };

        // Drop any known field that isn't allowed for the new action
        for (const k of Object.keys(next)) {
            if (keepAlways.has(k)) continue;
            if (knownFields.has(k) && !allowed.has(k)) {
                delete next[k];
            }
        }

        // Initialize required fields if missing
        for (const f of (cfg?.fields || [])) {
            if (f.required && (next[f.name] === undefined || next[f.name] === null)) {
                next[f.name] = (f.type === 'number') ? 0 : '';
            }
        }

        return next;
    }

    // Capture and format keyboard shortcuts, e.g. "Ctrl+Shift+K" or "Enter"
    function formatKeyFromEvent(e) {
        const mods = [];
        if (e.ctrlKey) mods.push('Ctrl');
        if (e.altKey) mods.push('Alt');
        if (e.shiftKey) mods.push('Shift');
        if (e.metaKey) mods.push('Meta');

        let k = e.key;

        // Normalize some common keys
        if (k === ' ') k = 'Space';
        if (k && k.length === 1) k = k.toUpperCase();

        // If only a modifier is pressed (no base key), ignore (wait for a real key)
        const onlyModifier = ['Control', 'Shift', 'Alt', 'Meta'].includes(k);
        if (onlyModifier) return null;

        return [...mods, k].join('+');
    }

    return (!stepsDraft || stepsDraft.length === 0) ? (
        <div className="text-zinc-400 text-sm">Este mapa não possui steps.</div>
    ) : (
        <Reorder.Group axis="y" values={stepsDraft} onReorder={setStepsDraft} className="space-y-2">
            {stepsDraft.map((st, idx) => (
                <Reorder.Item
                    key={st.__id ?? idx}
                    value={st}
                    as="li"
                    className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                    layout
                    transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
                    whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
                    onMouseLeave={() => setOpenActionIdx(null)}
                    onDrag={handleDragAutoScroll}
                    onDragEnd={stopAutoScroll}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            {(() => {
                                const { icon, classes } = actionMeta(st?.action);
                                return (
                                    <>
                                        {/* row 1: action + description (click-to-edit) */}
                                        <div className="flex items-center gap-3 text-sm">
                                            <button
                                                type="button"
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={() => setOpenActionIdx(openActionIdx === idx ? null : idx)}
                                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${classes}`}
                                            >
                                                <FontAwesomeIcon icon={icon} className="h-3 w-3" />
                                                {st?.action || '—'}
                                            </button>

                                            {editingField.idx === idx && editingField.field === 'description' ? (
                                                <input
                                                    autoFocus
                                                    value={st?.description ?? ''}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setStepsDraft(prev => {
                                                            const arr = prev.slice();
                                                            arr[idx] = { ...(arr[idx] || {}), description: v.trim() === '' ? undefined : v };
                                                            return arr;
                                                        });
                                                    }}
                                                    onBlur={() => { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') {
                                                            if (editSnapshot && editSnapshot.idx === idx && editSnapshot.field === 'description') {
                                                                const orig = editSnapshot.value;
                                                                setStepsDraft(prev => {
                                                                    const arr = prev.slice();
                                                                    arr[idx] = { ...(arr[idx] || {}), description: orig?.trim() ? orig : undefined };
                                                                    return arr;
                                                                });
                                                            }
                                                            setEditingField({ idx: null, field: null }); setEditSnapshot(null);
                                                        }
                                                        if (e.key === 'Enter') { setEditingField({ idx: null, field: null }); setEditSnapshot(null); }
                                                    }}
                                                    className="w-full max-w-[520px] rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm"
                                                    placeholder="descrição"
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={() => {
                                                        setEditSnapshot({ idx, field: 'description', value: st?.description ?? '' });
                                                        setEditingField({ idx, field: 'description' });
                                                    }}
                                                    className="font-medium text-zinc-200 truncate hover:underline"
                                                    title="Clique para editar"
                                                >
                                                    {st?.description ? st.description : <span className="text-zinc-500">Adicionar descrição</span>}
                                                </button>
                                            )}
                                        </div>

                                        {/* action dropdown */}
                                        {openActionIdx === idx && (
                                            <div className="relative">
                                                <div className="absolute z-10 mt-1 w-auto min-w-[140px] max-w-[180px] rounded-lg border border-zinc-800 bg-zinc-900/95 shadow-lg p-1">
                                                    {ACTIONS.map(a => {
                                                        const { icon: ai, classes: c } = actionMeta(a);
                                                        const active = a === st?.action;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={a}
                                                                onClick={() => {
                                                                    setStepsDraft(prev => {
                                                                        const arr = prev.slice();
                                                                        const prevStep = arr[idx] || {};
                                                                        arr[idx] = pruneFieldsForAction(prevStep, a);
                                                                        return arr;
                                                                    });
                                                                    setOpenActionIdx(null);
                                                                }}
                                                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800 ${active ? 'bg-zinc-800' : ''}`}
                                                            >
                                                                <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-[2px] ${c}`}>
                                                                    <FontAwesomeIcon icon={ai} className="h-2.5 w-2.5" />
                                                                    {a}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* row 2: dynamic fields per action config */}
                                        {(() => {
                                            const cfg = ACTION_CONFIGS[st?.action] || { fields: [] };
                                            const fields = Array.isArray(cfg.fields) ? cfg.fields : [];
                                            if (fields.length === 0) return null;

                                            const gridCols = fields.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1';

                                            return (
                                                <div className={`mt-2 grid grid-cols-1 ${gridCols} gap-3`}>
                                                    {fields.map((f) => {
                                                        const fname = f.name;
                                                        const ftype = f.type || 'text';
                                                        const label = f.label || fname;
                                                        const value = st?.[fname] ?? (ftype === 'number' ? 0 : '');

                                                        const isEditing = editingField.idx === idx && editingField.field === fname;

                                                        // shared key handlers
                                                        const onCancel = () => { setEditingField({ idx: null, field: null }); setEditSnapshot(null); };
                                                        const onEsc = () => {
                                                            if (editSnapshot && editSnapshot.idx === idx && editSnapshot.field === fname) {
                                                                const orig = editSnapshot.value ?? (ftype === 'number' ? 0 : '');
                                                                setStepsDraft(prev => {
                                                                    const arr = prev.slice();
                                                                    arr[idx] = { ...(arr[idx] || {}), [fname]: orig };
                                                                    return arr;
                                                                });
                                                            }
                                                            onCancel();
                                                        };

                                                        // live updater
                                                        const onChangeLive = (nextValRaw) => {
                                                            const nextVal = (ftype === 'number')
                                                                ? (Number.isFinite(parseInt(nextValRaw)) ? parseInt(nextValRaw) : 0)
                                                                : nextValRaw;

                                                            setStepsDraft(prev => {
                                                                const arr = prev.slice();
                                                                const next = { ...(arr[idx] || {}) };
                                                                // treat empty strings as undefined for text fields (except selector which may be '')
                                                                if (ftype !== 'number') {
                                                                    const trimmed = String(nextVal).trim();
                                                                    next[fname] = trimmed === '' ? (fname === 'selector' ? '' : undefined) : nextVal;
                                                                } else {
                                                                    next[fname] = nextVal;
                                                                }
                                                                arr[idx] = next;
                                                                return arr;
                                                            });
                                                        };

                                                        // styles: selector grey by default
                                                        const baseBtnClass = fname === 'selector'
                                                            ? 'block w-full rounded-lg border border-transparent bg-zinc-900/40 px-2 py-1 text-left text-sm text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors'
                                                            : 'block w-full rounded-lg border border-transparent bg-zinc-900/40 px-2 py-1 text-left text-sm text-zinc-300 hover:border-zinc-700';

                                                        const inputClass = 'w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-sm' +
                                                            (fname === 'selector' ? ' text-white' : '');

                                                        return (
                                                            <div key={fname}>
                                                                {isEditing ? (
                                                                    ftype === 'number' ? (
                                                                        <input
                                                                            type="number"
                                                                            autoFocus
                                                                            onPointerDown={(e) => e.stopPropagation()}
                                                                            value={value}
                                                                            min={f.min ?? 0}
                                                                            step={f.step ?? 1}
                                                                            onChange={(e) => onChangeLive(e.target.value)}
                                                                            onBlur={onCancel}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Escape') onEsc();
                                                                                if (e.key === 'Enter') onCancel();
                                                                            }}
                                                                            className={inputClass}
                                                                            placeholder={f.placeholder || ''}
                                                                        />
                                                                    ) : /* TEXT INPUTS (with special capture mode for press->key) */
                                                                        st?.action === 'press' && fname === 'key' ? (
                                                                            // KEY CAPTURE INPUT (readOnly; listens for onKeyDown)
                                                                            <input
                                                                                autoFocus
                                                                                readOnly
                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                value={value || ''}
                                                                                onKeyDown={(e) => {
                                                                                    // prevent text from being typed
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();

                                                                                    // cancel edit with Esc
                                                                                    if (e.key === 'Escape') {
                                                                                        onEsc();
                                                                                        return;
                                                                                    }

                                                                                    // capture combo
                                                                                    const combo = formatKeyFromEvent(e);
                                                                                    if (!combo) return; // ignore pure modifier press

                                                                                    onChangeLive(combo);     // write to draft immediately
                                                                                    onCancel();              // close editor
                                                                                }}
                                                                                onBlur={onCancel}
                                                                                className={inputClass}
                                                                                placeholder="Pressione uma tecla…"
                                                                            />
                                                                        ) : (
                                                                            // DEFAULT TEXT INPUT (all other text fields)
                                                                            <input
                                                                                autoFocus
                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                value={value || ''}
                                                                                onChange={(e) => onChangeLive(e.target.value)}
                                                                                onBlur={onCancel}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Escape') onEsc();
                                                                                    if (e.key === 'Enter') onCancel();
                                                                                }}
                                                                                className={inputClass}
                                                                                placeholder={f.placeholder || ''}
                                                                            />
                                                                        )
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onPointerDown={(e) => e.stopPropagation()}
                                                                        onClick={() => {
                                                                            setEditSnapshot({ idx, field: fname, value });
                                                                            setEditingField({ idx, field: fname });
                                                                        }}
                                                                        className={baseBtnClass}
                                                                        title={`Clique para editar ${label}`}
                                                                    >
                                                                        {value !== undefined && value !== '' ? (
                                                                            String(value)
                                                                        ) : (
                                                                            <span className="text-zinc-500">Adicionar {label.toLowerCase()}</span>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-zinc-500">#{idx + 1}</span>
                            <button
                                onClick={() => onDeleteStep(idx)}
                                className="grid h-6 w-6 place-items-center rounded-md border border-red-600/40 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                                type="button"
                                title="Remover step"
                                aria-label="Remover step"
                            >
                                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
}
