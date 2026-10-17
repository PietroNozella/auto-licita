-- Remove a tabela de notificacoes: era escrita mas nunca lida.
-- O estado de leitura real vive em resultados_licitacoes.notificado
-- (atualizado pela rota /api/monitor/resultados/marcar-lida).
-- Policies e indices da tabela sao removidos junto.
drop table if exists notificacoes;
