'use client';
import {
    faDownload,
    faUpload,
    faMousePointer,
    faPenToSquare,
    faKeyboard,
    faListCheck,
    faQuestionCircle,
    faICursor,  // type
    faClock,     // wait
    faBookOpen   // read
} from '@fortawesome/free-solid-svg-icons';

import { FIELD_PRESETS } from './fieldPresets';

// JSON configs
import clickCfg from './actions/click.json';
import fillCfg from './actions/fill.json';
import typeCfg from './actions/type.json';
import selectCfg from './actions/select.json';
import readCfg from './actions/read.json';
import uploadCfg from './actions/upload.json';
import downloadCfg from './actions/download.json';
import pressCfg from './actions/press.json';
import waitCfg from './actions/wait.json';

// -------------- Preset-aware resolvers --------------
function resolveFieldSpec(spec) {
    // 1) String preset: "selector" or "selector?" (optional)
    if (typeof spec === 'string') {
        let key = spec;
        let requiredOverride;
        if (key.endsWith('?')) {                 // allow "selector?" to force optional
            requiredOverride = false;
            key = key.slice(0, -1);
        }
        const base = FIELD_PRESETS[key];
        if (!base) return null;
        return { ...base, ...(requiredOverride !== undefined ? { required: requiredOverride } : {}) };
    }

    // 2) Object with { preset: "selector", ...overrides }
    if (spec && typeof spec === 'object' && 'preset' in spec) {
        const base = FIELD_PRESETS[spec.preset];
        if (!base) return null;
        // Merge: explicit overrides from JSON win over preset defaults
        const { preset, ...overrides } = spec;
        // Ensure we keep the canonical `name` from the preset unless overridden
        return { ...base, ...overrides, name: overrides.name ?? base.name };
    }

    // 3) Plain field object with a name/type (rare; kept for flexibility)
    if (spec && typeof spec === 'object' && spec.name) {
        return spec;
    }

    return null;
}

function resolveConfig(cfg) {
    const rawFields = Array.isArray(cfg?.fields) ? cfg.fields : [];
    const fields = rawFields.map(resolveFieldSpec).filter(Boolean);
    return { ...cfg, fields };
}

// Ordered list for menus
export const ACTIONS = [
    'download',
    'upload',
    'click',
    'fill',
    'type',
    'press',
    'select',
    'wait',
    'read'
];

// Map action -> RESOLVED config (fields expanded from presets)
export const ACTION_CONFIGS = {
    click: resolveConfig(clickCfg),
    fill: resolveConfig(fillCfg),
    type: resolveConfig(typeCfg),
    select: resolveConfig(selectCfg),
    read: resolveConfig(readCfg),
    upload: resolveConfig(uploadCfg),
    download: resolveConfig(downloadCfg),
    press: resolveConfig(pressCfg),
    wait: resolveConfig(waitCfg),
};

// Icons + color badges (unchanged)
export function actionMeta(action) {
    const a = String(action || '').toLowerCase();
    if (a === 'download') return { icon: faDownload, classes: 'text-cyan-300 border-cyan-700/50 bg-cyan-900/30' };
    if (a === 'upload') return { icon: faUpload, classes: 'text-emerald-300 border-emerald-700/50 bg-emerald-900/30' };
    if (a === 'click') return { icon: faMousePointer, classes: 'text-sky-300 border-sky-700/50 bg-sky-900/30' };
    if (a === 'fill') return { icon: faPenToSquare, classes: 'text-amber-300 border-amber-700/50 bg-amber-900/30' };
    if (a === 'type') return { icon: faICursor, classes: 'text-indigo-300 border-indigo-700/50 bg-indigo-900/30' };
    if (a === 'press') return { icon: faKeyboard, classes: 'text-violet-300 border-violet-700/50 bg-violet-900/30' };
    if (a === 'select') return { icon: faListCheck, classes: 'text-fuchsia-300 border-fuchsia-700/50 bg-fuchsia-900/30' };
    if (a === 'wait') return { icon: faClock, classes: 'text-yellow-300 border-yellow-700/50 bg-yellow-900/30' };
    if (a === 'read') return { icon: faBookOpen, classes: 'text-lime-300 border-lime-700/50 bg-lime-900/30' };
    return { icon: faQuestionCircle, classes: 'text-zinc-300 border-zinc-700/50 bg-zinc-900/30' };
}
