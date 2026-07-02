// server.js
// Backend do "Flow" (chat de IA do PraticaMente).
//
// O que este arquivo resolve:
//  1) A chave da Groq deixa de existir no front-end e passa a viver so aqui,
//     lida de uma variavel de ambiente (nunca commitada no Git).
//  2) O modelo "llama-3.3-70b-versatile" foi descontinuado pela Groq
//     (aviso em 17/06/2026, desligamento em 16/08/2026) -> ja migrado para
//     "openai/gpt-oss-120b", a substituicao recomendada oficialmente.
//  3) O Flow ganhou memoria de curto prazo: antes, cada mensagem era enviada
//     sozinha (sem as trocas anteriores), entao ele "esquecia" a conversa
//     a cada resposta. Agora o front-end manda o historico e o backend
//     valida/limita esse historico antes de repassar pra Groq.
//  4) Limite de uso (rate limit) por IP no endpoint de chat, pra nao deixar
//     seu saldo na Groq exposto a abuso caso alguem descubra a URL.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// --- CONFIGURACAO BASICA ---
const PORT = process.env.PORT || 3000; // o Render injeta PORT sozinho em producao, nao precisa fixar
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'openai/gpt-oss-120b'; // substituicao oficial da Groq para llama-3.3-70b-versatile (ver nota acima)

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY nao definida. Configure essa variavel de ambiente antes de iniciar o servidor.');
  process.exit(1);
}

// --- CORS ---
// Defina CORS_ORIGIN no .env (ou no dashboard do Render) com o(s) dominio(s)
// do seu front-end, separados por virgula. Ex:
// CORS_ORIGIN=https://praticamente.onrender.com,http://127.0.0.1:5500
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
  })
);

if (!allowedOrigins.length) {
  console.warn('CORS_ORIGIN nao definida: aceitando chamadas de qualquer origem. Restrinja isso em producao.');
}

app.use(express.json({ limit: '10kb' })); // payload pequeno de proposito: isso aqui so recebe texto de chat

// --- LIMITE DE USO NO CHAT ---
// Protege seu saldo na Groq: no maximo 15 mensagens por minuto, por IP.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas mensagens em pouco tempo. Aguarde um instante antes de tentar novamente.' },
});

// --- PERSONA DO FLOW (migrada do front-end, sem nenhuma mudanca de conteudo) ---
function buildSystemPrompt(userName, enneagramType) {
  const safeName = (typeof userName === 'string' && userName.trim() ? userName : 'Lider').slice(0, 50);
  const safeType = (typeof enneagramType === 'string' && enneagramType.trim()
    ? enneagramType
    : 'nao diagnosticado no Eneagrama'
  ).slice(0, 50);

  return `Voce e o Flow, mentor estrategico focado em alta performance. Voce atua integrando Eneagrama, Estoicismo, Programacao Neurolinguistica (PNL) e Andragogia. Responda de forma assertiva, profissional e pragmatica. O usuario atual chama-se ${safeName} e possui perfil ${safeType}.`;
}

// --- SANITIZACAO DO HISTORICO DE CONVERSA ---
// So aceita itens no formato certo, corta mensagens muito longas e mantem
// so as ultimas trocas -- isso e o que da "memoria" ao Flow sem deixar
// alguem inflar o payload (e o custo de tokens) de proposito.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12) // ultimas 12 mensagens = 6 trocas completas
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

// --- ENDPOINT PRINCIPAL DO CHAT ---
app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, userName, enneagramType, history } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem invalida.' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Mensagem muito longa (maximo de 2000 caracteres).' });
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(userName, enneagramType) },
    ...sanitizeHistory(history),
    { role: 'user', content: message.trim() },
  ];

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Erro retornado pela Groq:', groqResponse.status, errText);
      return res.status(502).json({ error: 'A IA esta indisponivel no momento. Tente novamente em instantes.' });
    }

    const data = await groqResponse.json();
    const reply =
      data?.choices?.[0]?.message?.content || 'Minhas conexoes neurais oscilaram. Reformule o foco da questao.';

    return res.json({ reply });
  } catch (err) {
    console.error('Falha ao chamar a Groq:', err);
    return res.status(500).json({ error: 'Falha ao sincronizar com a inteligencia central. Tente em instantes.' });
  }
});

// --- HEALTH CHECK (util para o Render monitorar o servico) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => res.send('Backend do PraticaMente no ar. Use POST /api/chat.'));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
