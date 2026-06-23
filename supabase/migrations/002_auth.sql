-- Adiciona coluna user_id na tabela monitoramentos
alter table monitoramentos add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Indice para busca por usuario
create index if not exists idx_monitoramentos_user on monitoramentos(user_id);

-- RLS (Row Level Security) - cada usuario ve seus proprios dados
alter table monitoramentos enable row level security;
alter table resultados_licitacoes enable row level security;
alter table notificacoes enable row level security;

-- Monitoramentos
drop policy if exists "Usuarios podem ver seus monitoramentos" on monitoramentos;
create policy "Usuarios podem ver seus monitoramentos"
  on monitoramentos for select
  using (auth.uid() = user_id);

drop policy if exists "Usuarios podem criar seus monitoramentos" on monitoramentos;
create policy "Usuarios podem criar seus monitoramentos"
  on monitoramentos for insert
  with check (auth.uid() = user_id);

drop policy if exists "Usuarios podem editar seus monitoramentos" on monitoramentos;
create policy "Usuarios podem editar seus monitoramentos"
  on monitoramentos for update
  using (auth.uid() = user_id);

drop policy if exists "Usuarios podem excluir seus monitoramentos" on monitoramentos;
create policy "Usuarios podem excluir seus monitoramentos"
  on monitoramentos for delete
  using (auth.uid() = user_id);

-- Resultados
drop policy if exists "Usuarios veem resultados dos seus monitoramentos" on resultados_licitacoes;
create policy "Usuarios veem resultados dos seus monitoramentos"
  on resultados_licitacoes for select
  using (
    exists (
      select 1 from monitoramentos
      where monitoramentos.id = resultados_licitacoes.monitoramento_id
      and monitoramentos.user_id = auth.uid()
    )
  );

drop policy if exists "Usuarios podem atualizar resultados dos seus monitoramentos" on resultados_licitacoes;
create policy "Usuarios podem atualizar resultados dos seus monitoramentos"
  on resultados_licitacoes for update
  using (
    exists (
      select 1 from monitoramentos
      where monitoramentos.id = resultados_licitacoes.monitoramento_id
      and monitoramentos.user_id = auth.uid()
    )
  );

-- Notificacoes
drop policy if exists "Usuarios veem notificacoes dos seus resultados" on notificacoes;
create policy "Usuarios veem notificacoes dos seus resultados"
  on notificacoes for select
  using (
    exists (
      select 1 from resultados_licitacoes
      join monitoramentos on monitoramentos.id = resultados_licitacoes.monitoramento_id
      where notificacoes.resultado_id = resultados_licitacoes.id
      and monitoramentos.user_id = auth.uid()
    )
  );
