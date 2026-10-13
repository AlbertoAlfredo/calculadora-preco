import { Capacitor } from '@capacitor/core';
import { Produto } from '../models/produto.model';
import { LocalStorageProdutoRepository } from './local-storage-produto.repository';
import { SqliteProdutoRepository } from './sqlite-produto.repository';

/**
 * Contrato da camada de dados. As telas e o ProdutoService só conhecem esta classe,
 * então dá para trocar o armazenamento sem mexer no resto do app.
 */
export abstract class ProdutoRepository {
  /** Abre o banco e aplica as migrações pendentes. */
  abstract inicializar(): Promise<void>;
  abstract listar(): Promise<Produto[]>;
  /** Insere ou atualiza o produto (e substitui todos os ingredientes dele). */
  abstract salvar(produto: Produto): Promise<void>;
  abstract remover(id: string): Promise<void>;
}

export function criarProdutoRepository(): ProdutoRepository {
  return Capacitor.isNativePlatform() ? new SqliteProdutoRepository() : new LocalStorageProdutoRepository();
}

