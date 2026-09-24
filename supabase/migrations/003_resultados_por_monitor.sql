-- Unicidade passa a ser por (monitoramento, edital):
-- o mesmo edital pode aparecer em monitores distintos sem colidir.
alter table resultados_licitacoes
  drop constraint if exists resultados_licitacoes_numero_controle_pncp_key;

alter table resultados_licitacoes
  add constraint resultados_licitacoes_monitor_pncp_unique
  unique (monitoramento_id, numero_controle_pncp);
