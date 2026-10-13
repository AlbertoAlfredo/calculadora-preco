import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { ProdutoService } from '../../services/produto.service';
import {
  Ingrediente,
  MEDIDAS,
  ROTULO_UNIDADE,
  TipoMedida,
  Unidade,
  custoIngrediente,
  custoPorUnidade,
  custoTotal,
  gerarId,
  normalizarIngrediente,
  precoSugerido,
} from '../../models/produto.model';

type IngredienteForm = FormGroup<{
  id: FormControl<string>;
  nome: FormControl<string>;
  tipo: FormControl<TipoMedida>;
  precoBase: FormControl<number | null>;
  quantidadeCompra: FormControl<number | null>;
  unidadeCompra: FormControl<Unidade>;
  quantidadeUsada: FormControl<number | null>;
  unidadeUso: FormControl<Unidade>;
}>;

@Component({
  selector: 'app-produto-form',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './produto-form.html',
})
export class ProdutoForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ProdutoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly medidas = MEDIDAS;
  protected readonly rotuloUnidade = ROTULO_UNIDADE;
  protected readonly tiposMedida = Object.keys(MEDIDAS) as TipoMedida[];
  protected readonly custoIngrediente = custoIngrediente;

  private readonly idProduto = this.route.snapshot.paramMap.get('id');
  protected readonly editando = !!this.idProduto;
  protected readonly naoEncontrado = signal(false);
  protected readonly tentouSalvar = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroAoSalvar = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(80)]],
    descricao: [''],
    rendimento: this.fb.control<number | null>(1, [Validators.min(1)]),
    margemLucro: this.fb.control<number | null>(0, [Validators.min(0)]),
    ingredientes: this.fb.array<IngredienteForm>([]),
  });

  protected get ingredientes(): FormArray<IngredienteForm> {
    return this.form.controls.ingredientes;
  }

  /** Valor do formulário como signal, para os cálculos ao vivo. */
  private readonly valor = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly itensNormalizados = computed(() =>
    this.valor().ingredientes.map((i) => ({
      ...i,
      precoBase: Number(i.precoBase) || 0,
      quantidadeCompra: Number(i.quantidadeCompra) || 1,
      quantidadeUsada: Number(i.quantidadeUsada) || 0,
    })),
  );

  protected readonly total = computed(() => custoTotal(this.itensNormalizados()));
  protected readonly rendimento = computed(() => Math.max(1, Number(this.valor().rendimento) || 1));
  protected readonly margem = computed(() => Math.max(0, Number(this.valor().margemLucro) || 0));
  protected readonly porUnidade = computed(() => custoPorUnidade(this.total(), this.rendimento()));
  protected readonly sugerido = computed(() => precoSugerido(this.porUnidade(), this.margem()));
  protected readonly lucroPorUnidade = computed(() => this.sugerido() - this.porUnidade());

  /** Participação de cada ingrediente no custo total (para o gráfico de barras). */
  protected readonly composicao = computed(() => {
    const total = this.total();
    return this.itensNormalizados()
      .map((i) => ({ nome: i.nome || 'Sem nome', custo: custoIngrediente(i), id: i.id }))
      .filter((i) => i.custo > 0)
      .sort((a, b) => b.custo - a.custo)
      .map((i) => ({ ...i, pct: total > 0 ? (i.custo / total) * 100 : 0 }));
  });

  constructor() {
    if (this.idProduto) {
      const produto = this.service.buscar(this.idProduto);
      if (!produto) {
        this.naoEncontrado.set(true);
        return;
      }
      this.form.patchValue({
        nome: produto.nome,
        descricao: produto.descricao ?? '',
        rendimento: produto.rendimento,
        margemLucro: produto.margemLucro,
      });
      produto.ingredientes.forEach((i) => this.ingredientes.push(this.criarIngrediente(i)));
    } else {
      this.adicionarIngrediente();
    }
  }

  protected adicionarIngrediente(): void {
    this.ingredientes.push(this.criarIngrediente());
  }

  protected removerIngrediente(index: number): void {
    this.ingredientes.removeAt(index);
  }

  protected aoMudarTipo(grupo: IngredienteForm): void {
    const tipo = grupo.controls.tipo.value;
    const config = this.medidas[tipo];
    grupo.controls.unidadeCompra.setValue(config.unidadeCompraPadrao);
    grupo.controls.unidadeUso.setValue(config.unidadeUsoPadrao);
  }

  protected campoInvalido(ctrl: FormControl<unknown>): boolean {
    return ctrl.invalid && (ctrl.touched || this.tentouSalvar());
  }

  protected async salvar(): Promise<void> {
    this.tentouSalvar.set(true);
    if (this.form.invalid || this.salvando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.salvando.set(true);
    this.erroAoSalvar.set(null);
    try {
      await this.service.salvar({
        id: this.idProduto ?? undefined,
        nome: v.nome.trim(),
        descricao: v.descricao.trim(),
        rendimento: this.rendimento(),
        margemLucro: this.margem(),
        ingredientes: v.ingredientes.map<Ingrediente>((i) => ({
          id: i.id,
          nome: i.nome.trim(),
          tipo: i.tipo,
          precoBase: Number(i.precoBase) || 0,
          quantidadeCompra: Number(i.quantidadeCompra) || 1,
          unidadeCompra: i.unidadeCompra,
          quantidadeUsada: Number(i.quantidadeUsada) || 0,
          unidadeUso: i.unidadeUso,
        })),
      });
      await this.router.navigate(['/produtos']);
    } catch (e) {
      console.error(e);
      this.erroAoSalvar.set('Não foi possível salvar o produto. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  private criarIngrediente(raw?: Partial<Ingrediente> & Pick<Ingrediente, 'id' | 'nome'>): IngredienteForm {
    const i = raw ? normalizarIngrediente(raw) : undefined;
    const tipoPadrao: TipoMedida = i?.tipo ?? 'peso';
    const configPadrao = this.medidas[tipoPadrao];

    return this.fb.group({
      id: [i?.id ?? gerarId()],
      nome: [i?.nome ?? '', Validators.required],
      tipo: this.fb.control<TipoMedida>(tipoPadrao),
      precoBase: this.fb.control<number | null>(i?.precoBase ?? null, [Validators.required, Validators.min(0)]),
      quantidadeCompra: this.fb.control<number | null>(i?.quantidadeCompra ?? 1, [Validators.required, Validators.min(0.0001)]),
      unidadeCompra: this.fb.control<Unidade>(i?.unidadeCompra ?? configPadrao.unidadeCompraPadrao),
      quantidadeUsada: this.fb.control<number | null>(i?.quantidadeUsada ?? null, [Validators.required, Validators.min(0)]),
      unidadeUso: this.fb.control<Unidade>(i?.unidadeUso ?? configPadrao.unidadeUsoPadrao),
    });
  }
}

