# On the Rocks — App (PWA)

App de coquetéis dos usuários finais (React + Vite + Firebase, PWA/TWA no Android). Backend compartilhado com o Manager (`on-the-rocks-manager`).

## Deploy e ambiente

- Está em `https://barbook-otyb.vercel.app` (Vercel, projeto Vercel chamado "on-the-rocks", repositório GitHub `mps257p3/barbook`).
- O Vercel está conectado ao GitHub — **deploya automaticamente a cada `git push` na `main`**.
- Fluxo correto após alterações: `npm run build` (verificação local) → `git status` → `git add` → `git commit` → `git push` → Vercel deploya sozinho.
- O **Manager** (`on-the-rocks-manager`) é outro projeto Vercel/repositório separado — painel administrativo que grava os dados que este app lê.

## Regras importantes

- **Após qualquer alteração de código: `npm run build` → `git status` → `git add` → `git commit` → `git push`.** Sempre. Sem exceção. Não deixar alterações só locais.
- **Antes de cada `git push`, rodar `git status` e verificar se há arquivos _untracked_ que sejam importados pelo código.** O build local passa mesmo com arquivos não commitados (eles existem no disco), mas o Vercel falha porque só tem acesso ao que está no git.
- As API keys de serviço (Firebase, Anthropic, Play) ficam como variáveis de ambiente no Vercel (`FIREBASE_SERVICE_ACCOUNT`, `ANTHROPIC_API_KEY`, `PLAY_SERVICE_ACCOUNT`) — nunca commitadas no repositório.
