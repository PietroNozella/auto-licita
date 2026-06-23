export interface RecuperarOrgaoEntidadeDTO {
  cnpj: string
  razaoSocial: string
  poderId: string
  esferaId: string
}

export interface RecuperarUnidadeOrgaoDTO {
  ufNome: string
  codigoUnidade: string
  nomeUnidade: string
  ufSigla: string
  municipioNome: string
  codigoIbge: string
}

export interface RecuperarAmparoLegalDTO {
  descricao: string
  nome: string
  codigo: number
}

export interface ContratacaoFonteOrcamentariaDTO {
  codigo: number
  nome: string
  descricao: string
  dataInclusao: string
}

export interface RecuperarCompraPublicacaoDTO {
  anoCompra: number
  sequencialCompra: number
  numeroCompra: string
  processo: string
  objetoCompra: string
  informacaoComplementar: string
  srp: boolean
  numeroControlePNCP: string
  linkSistemaOrigem: string
  linkProcessoEletronico: string
  orgaoEntidade: RecuperarOrgaoEntidadeDTO
  unidadeOrgao: RecuperarUnidadeOrgaoDTO
  orgaoSubRogado: RecuperarOrgaoEntidadeDTO | null
  unidadeSubRogada: RecuperarUnidadeOrgaoDTO | null
  modalidadeId: number
  modalidadeNome: string
  modoDisputaId: number
  modoDisputaNome: string
  tipoInstrumentoConvocatorioCodigo: number
  tipoInstrumentoConvocatorioNome: string
  amparoLegal: RecuperarAmparoLegalDTO
  fontesOrcamentarias: ContratacaoFonteOrcamentariaDTO[]
  situacaoCompraId: string
  situacaoCompraNome: string
  valorTotalEstimado: number
  valorTotalHomologado: number
  emendaParlamentar: boolean
  justificativaPresencial: string
  dataPublicacaoPncp: string
  dataAberturaProposta: string
  dataEncerramentoProposta: string
  dataInclusao: string
  dataAtualizacao: string
  dataAtualizacaoGlobal: string
  usuarioNome: string
}

export interface PaginaRetornoRecuperarCompraPublicacaoDTO {
  data: RecuperarCompraPublicacaoDTO[]
  totalRegistros: number
  totalPaginas: number
  numeroPagina: number
  paginasRestantes: number
  empty: boolean
}

export interface PncpSearchParams {
  dataInicial: string
  dataFinal: string
  codigoModalidadeContratacao?: number
  codigoModoDisputa?: number
  uf?: string
  codigoMunicipioIbge?: string
  cnpj?: string
  codigoUnidadeAdministrativa?: string
  pagina: number
  tamanhoPagina?: number
}

export interface Monitoramento {
  id: string
  nome: string
  palavras_chave: string[]
  uf: string | null
  modalidade_id: number | null
  cnpj_orgao: string | null
  ativo: boolean
  ultima_verificacao: string | null
  created_at: string
}

export interface ResultadoLicitacao {
  id: string
  numero_controle_pncp: string
  monitoramento_id: string
  objeto_compra: string
  orgao_nome: string
  orgao_cnpj: string
  uf: string
  modalidade_nome: string
  valor_total_estimado: number
  data_publicacao: string
  data_abertura_proposta: string
  data_encerramento_proposta: string
  link: string
  criado_em: string
  notificado: boolean
}
