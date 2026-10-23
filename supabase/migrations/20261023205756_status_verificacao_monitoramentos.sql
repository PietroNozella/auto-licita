-- NULL preserva a incerteza sobre verificações feitas antes desta migration.
alter table public.monitoramentos
  add column status_verificacao_automatica text
  constraint monitoramentos_status_verificacao_automatica_check
  check (status_verificacao_automatica in ('completa', 'incompleta', 'erro'));
