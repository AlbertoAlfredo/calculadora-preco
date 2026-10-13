import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProdutoService } from '../../services/produto.service';
import { Produto, custoPorUnidade, custoTotal, precoSugerido } from '../../models/produto.model';

interface ProdutoResumo {
  produto: Produto;
  total: number;
  porUnidade: number;
  sugerido: number;
}

@Component({
  selector: 'app-produto-lista',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './produto-lista.html',
})
export class ProdutoLista {
  private readonly service = inject(ProdutoService);

  protected readonly busca = signal('');
  protected readonly confirmandoExclusao = signal<string | null>(null);

  protected readonly resumos = computed<ProdutoResumo[]>(() =>
    this.service.produtos().map((produto) => {
      const total = custoTotal(produto.ingredientes);
      const porUnidade = custoPorUnidade(total, produto.rendimento);
      return { produto, total, porUnidade, sugerido: precoSugerido(porUnidade, produto.margemLucro) };
    }),
  );

  protected readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.resumos();
    return this.resumos().filter(
      (r) =>
        r.produto.nome.toLowerCase().includes(termo) ||
        r.produto.ingredientes.some((i) => i.nome.toLowerCase().includes(termo)),
    );
  });

  protected readonly totalProdutos = computed(() => this.resumos().length);
  protected readonly custoMedio = computed(() => {
    const lista = this.resumos();
    return lista.length ? lista.reduce((s, r) => s + r.porUnidade, 0) / lista.length : 0;
  });

  protected async duplicar(id: string): Promise<void> {
    await this.service.duplicar(id);
  }

  protected pedirExclusao(id: string): void {
    this.confirmandoExclusao.set(id);
  }

  protected async confirmarExclusao(): Promise<void> {
    const id = this.confirmandoExclusao();
    this.confirmandoExclusao.set(null);
    if (id) await this.service.remover(id);
  }
}

