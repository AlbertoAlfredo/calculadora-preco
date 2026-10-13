import { Injectable, computed, inject, signal } from '@angular/core';
import { Produto, gerarId } from '../models/produto.model';
import { ProdutoRepository } from '../data/produto.repository';

type DadosProduto = Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string };

/**
 * Estado dos produtos em memória (signals) sincronizado com o banco local.
 * Lê tudo uma vez na inicialização e grava no banco a cada alteração.
 */
@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly repo = inject(ProdutoRepository);
  private readonly _produtos = signal<Produto[]>([]);

  /** Mensagem de erro caso o banco não abra. */
  readonly erro = signal<string | null>(null);

  readonly produtos = computed(() =>
    [...this._produtos()].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
  );

  async inicializar(): Promise<void> {
    try {
      await this.repo.inicializar();
      this._produtos.set(await this.repo.listar());
    } catch (e) {
      console.error('Falha ao abrir o banco de dados', e);
      this.erro.set('Não foi possível abrir o banco de dados do aparelho.');
    }
  }

  buscar(id: string): Produto | undefined {
    return this._produtos().find((p) => p.id === id);
  }

  async salvar(dados: DadosProduto): Promise<Produto> {
    const agora = new Date().toISOString();
    const existente = dados.id ? this.buscar(dados.id) : undefined;

    const produto: Produto = {
      ...dados,
      id: existente?.id ?? gerarId(),
      criadoEm: existente?.criadoEm ?? agora,
      atualizadoEm: agora,
    };

    await this.repo.salvar(produto);
    this._produtos.update((lista) =>
      existente ? lista.map((p) => (p.id === produto.id ? produto : p)) : [...lista, produto],
    );
    return produto;
  }

  async duplicar(id: string): Promise<Produto | undefined> {
    const original = this.buscar(id);
    if (!original) return undefined;
    const { id: _id, criadoEm, atualizadoEm, ...resto } = original;
    return this.salvar({
      ...resto,
      nome: `${original.nome} (cópia)`,
      ingredientes: original.ingredientes.map((i) => ({ ...i, id: gerarId() })),
    });
  }

  async remover(id: string): Promise<void> {
    await this.repo.remover(id);
    this._produtos.update((lista) => lista.filter((p) => p.id !== id));
  }
}
