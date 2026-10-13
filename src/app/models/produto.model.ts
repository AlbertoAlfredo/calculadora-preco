/**
 * Tipo de medida do insumo. Define quais unidades podem ser usadas:
 * - peso:    kg ou g
 * - volume:  litro ou ml
 * - unidade: un
 */
export type TipoMedida = 'peso' | 'volume' | 'unidade';

export type Unidade = 'kg' | 'g' | 'l' | 'ml' | 'un';

export interface Ingrediente {
  id: string;
  nome: string;
  tipo: TipoMedida;
  /** Preço pago pela quantidade de compra (ex.: R$ 4,50). */
  precoBase: number;
  /** Quantidade correspondente ao preço pago (ex.: 500). */
  quantidadeCompra: number;
  /** Unidade da quantidade de compra (ex.: g). */
  unidadeCompra: Unidade;
  /** Quantidade usada na receita (ex.: 2). */
  quantidadeUsada: number;
  /** Unidade da quantidade usada (ex.: kg). */
  unidadeUso: Unidade;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  ingredientes: Ingrediente[];
  /** Quantas unidades a receita rende (opcional, padrão 1). */
  rendimento: number;
  /** Margem de lucro desejada em % (opcional). */
  margemLucro: number;
  criadoEm: string;
  atualizadoEm: string;
}

export const MEDIDAS: Record<
  TipoMedida,
  { label: string; unidades: Unidade[]; unidadeCompraPadrao: Unidade; unidadeUsoPadrao: Unidade }
> = {
  peso: { label: 'Peso', unidades: ['kg', 'g'], unidadeCompraPadrao: 'kg', unidadeUsoPadrao: 'g' },
  volume: { label: 'Volume', unidades: ['l', 'ml'], unidadeCompraPadrao: 'l', unidadeUsoPadrao: 'ml' },
  unidade: { label: 'Unidade', unidades: ['un'], unidadeCompraPadrao: 'un', unidadeUsoPadrao: 'un' },
};

/** Fator de conversão para a unidade base do tipo (g, ml ou un). */
const FATOR: Record<Unidade, number> = { kg: 1000, g: 1, l: 1000, ml: 1, un: 1 };

export const ROTULO_UNIDADE: Record<Unidade, string> = { kg: 'kg', g: 'g', l: 'L', ml: 'ml', un: 'un' };

type DadosCusto = Pick<Ingrediente, 'precoBase' | 'quantidadeCompra' | 'unidadeCompra' | 'quantidadeUsada' | 'unidadeUso'>;

export function custoIngrediente(i: DadosCusto): number {
  const preco = Number(i.precoBase) || 0;
  const compraBase = (Number(i.quantidadeCompra) || 0) * FATOR[i.unidadeCompra];
  const usoBase = (Number(i.quantidadeUsada) || 0) * FATOR[i.unidadeUso];
  return compraBase > 0 ? (preco * usoBase) / compraBase : 0;
}

export function custoTotal(ingredientes: DadosCusto[]): number {
  return ingredientes.reduce((soma, i) => soma + custoIngrediente(i), 0);
}

export function custoPorUnidade(total: number, rendimento: number): number {
  return rendimento > 0 ? total / rendimento : total;
}

export function precoSugerido(custo: number, margem: number): number {
  return custo * (1 + (Number(margem) || 0) / 100);
}

/** Garante que a unidade pertence ao tipo; senão devolve a padrão. */
export function unidadeValida(tipo: TipoMedida, unidade: unknown, padrao: Unidade): Unidade {
  return MEDIDAS[tipo].unidades.includes(unidade as Unidade) ? (unidade as Unidade) : padrao;
}

/**
 * Completa ingredientes salvos em versões antigas (que só tinham preço por kg/L/un e uso em g/ml/un).
 */
export function normalizarIngrediente(i: Partial<Ingrediente> & Pick<Ingrediente, 'id' | 'nome'>): Ingrediente {
  const tipo: TipoMedida = i.tipo && i.tipo in MEDIDAS ? i.tipo : 'peso';
  const m = MEDIDAS[tipo];
  return {
    id: i.id,
    nome: i.nome,
    tipo,
    precoBase: Number(i.precoBase) || 0,
    quantidadeCompra: Number(i.quantidadeCompra) || 1,
    unidadeCompra: unidadeValida(tipo, i.unidadeCompra, m.unidadeCompraPadrao),
    quantidadeUsada: Number(i.quantidadeUsada) || 0,
    unidadeUso: unidadeValida(tipo, i.unidadeUso, m.unidadeUsoPadrao),
  };
}

export function gerarId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
