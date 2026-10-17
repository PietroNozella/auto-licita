# Afero

Busca e monitoramento de licitações públicas: consulta as publicações do PNCP,
salva monitoramentos por palavras-chave verificados diariamente e exporta os
resultados para CSV ou Google Sheets.

## Funcionalidades

- Busca por período, modalidade, UF e CNPJ do órgão, com filtro por palavras
- Monitoramentos com verificação diária via cron da Vercel
- Verificação manual de novidades do dia por monitoramento
- Exportação dos resultados para CSV ou Google Sheets
- Cadastro e login com Supabase Auth

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase (Auth + Postgres)
e googleapis para a exportação.

## Configuração

Crie o `.env.local` a partir do `.env.example`:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon usada pelo app |
| `SUPABASE_SERVICE_ROLE_KEY` | Usada pelo cron (ignora RLS) |
| `CRON_SECRET` | Protege a rota do cron |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account da exportação |
| `GOOGLE_PRIVATE_KEY` | Chave da service account, com `\n` escapado |

Para exportar para o Google Sheets, compartilhe a planilha de destino com o
email da service account.

## Banco de dados

Aplique as migrations de `supabase/migrations/` em ordem: 001, 002, 003, 004 e 005 (a 005 remove a tabela `notificacoes`, que não é usada pelo aplicativo).

## Scripts

```bash
npm run dev    # desenvolvimento
npm run build  # build de produção
npm start      # servidor de produção
npm run lint   # ESLint
```

## Cron

O `vercel.json` agenda `/api/cron/verificar` uma vez por dia (00:00 UTC).
A rota exige `Authorization: Bearer <CRON_SECRET>`; a Vercel envia esse header
automaticamente quando a variável está definida no projeto.
