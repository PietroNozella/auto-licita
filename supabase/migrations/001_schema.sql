-- Tabela de monitoramentos (filtros salvos pelo usuario)
create table monitoramentos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  palavras_chave text[],        -- palavras para buscar no objeto da compra
  uf text,                      -- filtro por estado
  modalidade_id bigint,         -- filtro por modalidade
  cnpj_orgao text,              -- filtro por orgao
  ativo boolean default true,
  ultima_verificacao timestamptz,
  created_at timestamptz default now()
);

-- Tabela de resultados cacheados
create table resultados_licitacoes (
  id uuid default gen_random_uuid() primary key,
  numero_controle_pncp text unique not null,
  monitoramento_id uuid references monitoramentos(id) on delete cascade,
  objeto_compra text,
  orgao_nome text,
  orgao_cnpj text,
  uf text,
  modalidade_nome text,
  valor_total_estimado numeric(15,2),
  data_publicacao timestamptz,
  data_abertura_proposta timestamptz,
  data_encerramento_proposta timestamptz,
  link text,
  criado_em timestamptz default now(),
  notificado boolean default false
);

-- Tabela de notificacoes
create table notificacoes (
  id uuid default gen_random_uuid() primary key,
  resultado_id uuid references resultados_licitacoes(id) on delete cascade,
  lida boolean default false,
  criado_em timestamptz default now()
);

-- Indices para busca eficiente
create index idx_monitoramentos_user on monitoramentos(user_id);
create index idx_resultados_monitoramento on resultados_licitacoes(monitoramento_id);
create index idx_resultados_notificado on resultados_licitacoes(notificado) where notificado = false;
create index idx_notificacoes_lida on notificacoes(lida) where lida = false;
create index idx_resultados_data on resultados_licitacoes(data_publicacao desc);

-- RLS (Row Level Security) - cada usuario ve seus proprios dados
alter table monitoramentos enable row level security;
alter table resultados_licitacoes enable row level security;
alter table notificacoes enable row level security;

create policy "Usuarios podem ver seus monitoramentos"
  on monitoramentos for select
  using (auth.uid() = user_id);

create policy "Usuarios podem criar seus monitoramentos"
  on monitoramentos for insert
  with check (auth.uid() = user_id);

create policy "Usuarios podem editar seus monitoramentos"
  on monitoramentos for update
  using (auth.uid() = user_id);

create policy "Usuarios podem excluir seus monitoramentos"
  on monitoramentos for delete
  using (auth.uid() = user_id);

create policy "Usuarios veem resultados dos seus monitoramentos"
  on resultados_licitacoes for select
  using (
    exists (
      select 1 from monitoramentos
      where monitoramentos.id = resultados_licitacoes.monitoramento_id
      and monitoramentos.user_id = auth.uid()
    )
  );

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
