// app/server.js (ESM)
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mapper from './mapear.js'; // CJS importado como default { start, stop }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== Config =====
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const WEB_DIST = path.resolve(__dirname, '../web/dist');      // serve frontend buildado
const MAP_DIR = path.resolve(__dirname, '../mapas');         // mapas em root/mapas

fs.mkdirSync(MAP_DIR, { recursive: true });

// ===== CORS (dev e prod) =====
// Em produção, se o frontend for servido por este servidor, CORS será “mesma origem”.
// Em dev (Vite), liberamos localhost e 127.0.0.1:5173.
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]);
const corsOpts = {
    origin(origin, cb) {
        if (!origin) return cb(null, true); // curl, same-origin ou servidor servindo o front
        if (allowedOrigins.has(origin)) return cb(null, true);
        return cb(null, true); // se quiser travar, troque para: cb(new Error('CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOpts));
// preflight robusto (evita bug de path-to-regexp com '*')
app.options(/.*/, cors(corsOpts));

// ===== Parsers =====
app.use(express.json());

// ===== Estado =====
let running = false;

// ===================== ROTAS API =====================

// Inicia mapeamento
app.post('/mapear', async (req, res) => {
    if (running) return res.status(409).json({ erro: 'Já rodando' });

    const { url, nomeArquivo, operacao, categoria } = req.body || {};
    if (!url || !nomeArquivo || !operacao) {
        return res.status(400).json({ erro: 'Envie url, nomeArquivo e operacao.' });
    }
    const op = String(operacao).toLowerCase();
    if (!['consultar', 'cadastrar', 'baixar', 'editar'].includes(op)) {
        return res.status(400).json({ erro: 'operacao inválida' });
    }

    try {
        const cat = (categoria && String(categoria).trim()) || String(nomeArquivo).trim();
        const outName = `mapa_${op}${cat.charAt(0).toUpperCase()}${cat.slice(1)}.json`;
        const outPath = path.join(MAP_DIR, outName);

        await mapper.start(url, outPath, op, cat); // usa sua implementação atual de mapear.js
        running = true;
        res.json({ mensagem: 'Mapeamento iniciado. Use /stop para finalizar.', arquivo: outName, operacao: op, categoria: cat });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

// Finaliza mapeamento
app.post('/stop', async (_req, res) => {
    if (!running) return res.status(409).json({ erro: 'Nada em execução' });
    try {
        await mapper.stop();
        running = false;
        res.json({ mensagem: 'Mapeamento finalizado.' });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

// Lista mapas
app.get('/mapas', async (_req, res) => {
    try {
        const files = await fs.promises.readdir(MAP_DIR);
        const jsons = files.filter(f => f.toLowerCase().endsWith('.json')).sort();
        res.json(jsons); // array simples para simplificar o frontend
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

// Lê mapa
app.get('/mapas/:nome', async (req, res) => {
    try {
        const nomeSeguro = path.basename(req.params.nome);
        if (!nomeSeguro.toLowerCase().endsWith('.json')) {
            return res.status(400).json({ erro: 'Arquivo inválido' });
        }
        const full = path.join(MAP_DIR, nomeSeguro);
        if (!fs.existsSync(full)) return res.status(404).json({ erro: 'Mapa não encontrado' });

        const raw = await fs.promises.readFile(full, 'utf8');
        res.type('application/json').send(raw);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

// Atualiza keys
app.post('/mapas/:nome/keys', async (req, res) => {
    try {
        const nomeSeguro = path.basename(req.params.nome);
        if (!nomeSeguro.toLowerCase().endsWith('.json')) {
            return res.status(400).json({ erro: 'Arquivo inválido' });
        }
        const full = path.join(MAP_DIR, nomeSeguro);
        if (!fs.existsSync(full)) return res.status(404).json({ erro: 'Mapa não encontrado' });

        const { mapping } = req.body || {};
        if (!mapping || typeof mapping !== 'object') {
            return res.status(400).json({ erro: 'Envie "mapping" como objeto { oldKey: newKey }' });
        }

        const mapa = JSON.parse(await fs.promises.readFile(full, 'utf8'));
        if (Array.isArray(mapa.steps)) {
            for (const step of mapa.steps) {
                if (step && typeof step.key === 'string' && mapping[step.key]) {
                    const newK = String(mapping[step.key]).trim();
                    if (newK) step.key = newK;
                }
            }
        }
        await fs.promises.writeFile(full, JSON.stringify(mapa, null, 2), 'utf8');
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});

// ===================== FRONTEND (build do Vite) =====================
// Sirva arquivos estáticos do build
app.use(express.static(WEB_DIST, { index: false, fallthrough: true }));

// SPA fallback: qualquer rota não-API devolve index.html
app.get(/^(?!\/(mapear|stop|mapas)\b).*/, (_req, res) => {
    res.sendFile(path.join(WEB_DIST, 'index.html'));
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log(`API + Frontend em http://localhost:${PORT}`);
});
