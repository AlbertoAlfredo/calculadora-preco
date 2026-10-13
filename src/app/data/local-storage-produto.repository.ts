import { Produto, normalizarIngrediente } from '../models/produto.model';
import type { ProdutoRepository } from './produto.repository';

const STORAGE_KEY = 'calculadora-preco:produtos';

/** Usado apenas no navegador (ng serve), para desenvolver sem precisar do celular. */
export class LocalStorageProdutoRepository implements ProdutoRepository {
  async inicializar(): Promise<void> {}

  async listar(): Promise<Produto[]> {
    return this.ler()
      .map((p) => ({
        ...p,
        ingredientes: (p.ingredientes ?? []).map((i) => normalizarIngrediente(i)),
      }))
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }

  async salvar(produto: Produto): Promise<void> {
    const lista = this.ler();
    const idx = lista.findIndex((p) => p.id === produto.id);
    if (idx >= 0) lista[idx] = produto;
    else lista.push(produto);
    this.gravar(lista);
  }

  async remover(id: string): Promise<void> {
    this.gravar(this.ler().filter((p) => p.id !== id));
  }

  private ler(): Produto[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Produto[];
    } catch {
      return [];
    }
  }

  private gravar(lista: Produto[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }
}

