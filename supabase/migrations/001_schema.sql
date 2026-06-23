-- Tabela de monitoramentos (filtros salvos pelo usuario)
create table monitoramentos (
  id uuid default gen_random_uuid() primary key,
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
create index idx_resultados_monitoramento on resultados_licitacoes(monitoramento_id);
create index idx_resultados_notificado on resultados_licitacoes(notificado) where notificado = false;
create index idx_notificacoes_lida on notificacoes(lida) where lida = false;
create index idx_resultados_data on resultados_licitacoes(data_publicacao desc);
