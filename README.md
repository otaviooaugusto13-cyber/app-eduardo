# PraticaMente — Backend do Flow

Backend minimo (Node + Express) que protege a chave da API da Groq e centraliza
a logica do chat de IA ("Flow"). O front-end nao fala mais direto com a Groq;
ele fala com este backend, que fala com a Groq usando uma chave que so existe
no servidor.

## Rodando localmente

```bash
cd backend
npm install
cp .env.example .env
# edite o .env e cole sua chave nova da Groq em GROQ_API_KEY
npm start
```

O servidor sobe em `http://localhost:3000`. Teste com:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Ola, Flow!","userName":"Otavio","enneagramType":"","history":[]}'
```

## Deploy no Render

1. Suba esta pasta `backend/` para o mesmo repositorio do seu front-end
   (`app-eduardo`), como uma subpasta — ou em um repositorio separado, como preferir.
2. No dashboard do Render: **New > Web Service** e conecte o repositorio.
3. Se o backend estiver em subpasta, configure **Root Directory** = `backend`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Em **Environment**, adicione as variaveis:
   - `GROQ_API_KEY` = sua chave nova (gerada depois de revogar a antiga)
   - `CORS_ORIGIN` = a URL do seu front-end publicado (pode listar mais de uma, separadas por virgula)
7. Deploy. O Render vai te dar uma URL do tipo `https://praticamente-backend.onrender.com`.
8. Copie essa URL para a constante `BACKEND_URL` no front-end (veja o patch do `index.html`).

> Dica: no plano gratuito do Render, o servico "dorme" apos 15 minutos sem uso
> e demora de 30 a 60 segundos pra acordar na proxima chamada — o que o usuario
> sentiria como o Flow "travado" na primeira mensagem do dia. Para um app em uso
> real, o plano Starter ($7/mes, sempre ativo) evita esse problema.

## Proximos passos sugeridos

- Adicionar endpoints `/api/journal` e `/api/progress` ligados a um Postgres,
  substituindo o `localStorage` do front-end (ver plano de acao completo).
- Adicionar autenticacao real de usuario, para os dados do banco pertencerem
  a uma conta de verdade e nao a "o que estiver salvo nesse navegador".
