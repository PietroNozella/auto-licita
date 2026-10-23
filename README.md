# Afero

Busca e monitoramento de licitações públicas: consulta as publicações do PNCP,
salva monitoramentos por palavras-chave verificados diariamente e exporta os
resultados para CSV ou Google Sheets.

## Funcionalidades

- Busca por período, modalidade, UF e CNPJ do órgão, com filtro por palavras
- Monitoramentos com verificação diária via cron da Vercel
- Edição dos filtros de monitoramento sem apagar publicações salvas
- Ordenação por publicação, encerramento e valor estimado
- Verificação manual de novidades do dia por monitoramento
- Exportação dos resultados para CSV ou Google Sheets
- Cadastro, login e recuperação de senha com Supabase Auth

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
| `NEXT_PUBLIC_SIGNUP_ENABLED` | Habilita o cadastro no app quando `true` (padrão: desativado) |
| `NEXT_PUBLIC_SHEETS_ENABLED` | Habilita a exportação para Sheets quando `true` (padrão: desativado) |

Para um teste fechado, desative também **Allow new users to sign up** no painel
do Supabase, em **Authentication → Sign In / Providers**, e crie a conta do
testador pelo painel. A flag do app não bloqueia o endpoint direto do Supabase.
Alterações nas variáveis `NEXT_PUBLIC_*` exigem um novo build/deploy.

Para recuperar senhas, autorize `https://SEU-DOMINIO/api/auth/recuperar-senha`
em **Authentication → URL Configuration → Redirect URLs** no Supabase
(em desenvolvimento: `http://localhost:3000/api/auth/recuperar-senha`).
O link enviado usa PKCE: abra-o no mesmo navegador em que solicitou a recuperação.

Para exportar para o Google Sheets, compartilhe a planilha de destino com o
email da service account.

## Banco de dados

Aplique as migrations de `supabase/migrations/` em ordem: 001, 002, 003, 004 e 005 (a 005 remove a tabela `notificacoes`, que não é usada pelo aplicativo).

Depois aplique `20261023205756_status_verificacao_monitoramentos.sql` antes de
publicar esta versão. Ela adiciona o estado da última verificação automática,
exibido quando a consulta fica incompleta ou falha. “Verificar hoje” consulta
somente o dia atual e não altera o estado da verificação automática da semana.
Verificações antigas ficam com estado desconhecido até a próxima execução do cron.

O histórico de cada monitoramento carrega 100 publicações por vez. Use
**Carregar mais publicações** para acessar as anteriores; as contagens incluem
todo o histórico.

## Scripts

```bash
npm run dev    # desenvolvimento
npm run build  # build de produção
npm start      # servidor de produção
npm run lint   # ESLint
npm test       # regressões de cancelamento e monitoramento, sem serviços reais
npm run validar:busca  # comparação com a fonte real; gera output/validacao-busca.json
```

A busca considera o período de **publicação** e encontra qualquer uma das
palavras no objeto, complemento ou nome do órgão, ignorando caixa e acentos.
Resultados são consultados em lotes; use **Verificar mais publicações**
até concluir o período. Enquanto houver páginas ou falhas da fonte,
a tela informa que a busca está incompleta. O CSV contém os resultados já encontrados.
A ordenação considera os resultados já encontrados. Prazos sem offset são
interpretados no horário de Brasília; datas sem horário valem até o fim do dia informado.

A validação ao vivo compara os IDs da fonte com os retornados pela rota e pela
continuação da busca. Para escolher outro dia: `npm run validar:busca -- 20261019`.
O login e a sessão do usuário no deploy precisam ser conferidos separadamente.

## Cron

O `vercel.json` agenda `/api/cron/verificar` uma vez por dia (00:00 UTC).
A rota exige `Authorization: Bearer <CRON_SECRET>`; a Vercel envia esse header
automaticamente quando a variável está definida no projeto.
