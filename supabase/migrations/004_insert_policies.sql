-- Policies de INSERT para o fluxo de "novidades do dia" (usuario autenticado).
-- Sem elas o RLS bloqueia a gravacao e o fluxo retorna sempre 0.

-- Permite ao usuario gravar resultados apenas em monitoramentos dele.
drop policy if exists "Usuarios inserem resultados dos seus monitoramentos" on resultados_licitacoes;
create policy "Usuarios inserem resultados dos seus monitoramentos"
  on resultados_licitacoes for insert
  with check (
    exists (
      select 1 from monitoramentos
      where monitoramentos.id = resultados_licitacoes.monitoramento_id
      and monitoramentos.user_id = auth.uid()
    )
  );

-- Permite ao usuario criar notificacoes apenas para resultados dele.
drop policy if exists "Usuarios inserem notificacoes dos seus resultados" on notificacoes;
create policy "Usuarios inserem notificacoes dos seus resultados"
  on notificacoes for insert
  with check (
    exists (
      select 1 from resultados_licitacoes
      join monitoramentos on monitoramentos.id = resultados_licitacoes.monitoramento_id
      where notificacoes.resultado_id = resultados_licitacoes.id
      and monitoramentos.user_id = auth.uid()
    )
  );
