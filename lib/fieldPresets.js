'use client';

// Reusable field blueprints used by multiple actions.
// You can safely tweak labels/placeholders here and every action that references
// the preset will inherit the change automatically.
export const FIELD_PRESETS = {
    description: {
        name: 'description',
        type: 'text',
        required: false,
        label: 'Descrição',
        placeholder: 'ex: clicar no botão Entrar'
    },
    selector: {
        name: 'selector',
        type: 'text',
        required: true,
        label: 'Selector',
        placeholder: "ex: [name='formCad:nome']"
    },
    field: {
        name: 'field',
        type: 'text',
        required: true,
        label: 'Campo',
        placeholder: 'ex: usuario'
    },
    key: {
        name: 'key',
        type: 'text',
        required: true,
        label: 'Tecla',
        placeholder: 'aperte uma tecla, ex: ENTER'
    },
    time: {
        name: 'time',
        type: 'number',
        required: true,
        label: 'Tempo (ms)',
        placeholder: 'ex: 1000'
    }
};
