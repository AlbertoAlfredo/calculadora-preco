import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection, capSQLiteSet } from '@capacitor-community/sqlite';
import { Ingrediente, MEDIDAS, Produto, TipoMedida } from '../models/produto.model';
import type { ProdutoRepository } from './produto.repository';
import { MIGRACOES } from './migracoes';

const DB_NAME = 'calculadora_preco';

interface ProdutoRow {
  id: string;
  nome: string;
  descricao: string | null;
  rendimento: number;
  margem_lucro: number;
  criado_em: string;
  atualizado_em: string;
}

interface IngredienteRow {
  id: string;
  produto_id: string;
  nome: string;
  tipo: TipoMedida;
  preco_base: number;
  quantidade_compra?: number;
  unidade_compra?: string;
  quantidade_usada: number;
  unidade_uso?: string;
  ordem: number;
}

/** Armazenamento em SQLite nativo do aparelho (Android) via @capacitor-community/sqlite. */
export class SqliteProdutoRepository implements ProdutoRepository {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: SQLiteDBConnection;

  async inicializar(): Promise<void> {
    const consistente = (await this.sqlite.checkConnectionsConsistency()).result;
    const existe = (await this.sqlite.isConnection(DB_NAME, false)).result;

    this.db =
      consistente && existe
        ? await this.sqlite.retrieveConnection(DB_NAME, false)
        : await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);

    await this.db.open();
    await this.db.execute('PRAGMA foreign_keys = ON;', false);
    await this.migrar();
  }

  async listar(): Promise<Produto[]> {
    const db = this.conexao();
    const produtos = ((await db.query('SELECT * FROM produtos ORDER BY atualizado_em DESC;')).values ?? []) as ProdutoRow[];
    const ingredientes = ((await db.query('SELECT * FROM ingredientes ORDER BY produto_id, ordem;')).values ??
      []) as IngredienteRow[];

    const porProduto = new Map<string, Ingrediente[]>();
    for (const row of ingredientes) {
      const lista = porProduto.get(row.produto_id) ?? [];
      const tipo: TipoMedida = row.tipo && row.tipo in MEDIDAS ? row.tipo : 'peso';
      const m = MEDIDAS[tipo];
      lista.push({
        id: row.id,
        nome: row.nome,
        tipo,
        precoBase: row.preco_base,
        quantidadeCompra: row.quantidade_compra ?? 1,
        unidadeCompra: (row.unidade_compra as any) ?? m.unidadeCompraPadrao,
        quantidadeUsada: row.quantidade_usada,
        unidadeUso: (row.unidade_uso as any) ?? m.unidadeUsoPadrao,
      });
      porProduto.set(row.produto_id, lista);
    }

    return produtos.map((row) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao ?? '',
      rendimento: row.rendimento,
      margemLucro: row.margem_lucro,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
      ingredientes: porProduto.get(row.id) ?? [],
    }));
  }

  async salvar(p: Produto): Promise<void> {
    // UPDATE + INSERT OR IGNORE em vez de INSERT OR REPLACE: o REPLACE apaga a linha
    // e dispararia o ON DELETE CASCADE dos ingredientes.
    const comandos: capSQLiteSet[] = [
      {
        statement: `UPDATE produtos SET nome = ?, descricao = ?, rendimento = ?, margem_lucro = ?, atualizado_em = ? WHERE id = ?;`,
        values: [p.nome, p.descricao ?? '', p.rendimento, p.margemLucro, p.atualizadoEm, p.id],
      },
      {
        statement: `INSERT OR IGNORE INTO produtos (id, nome, descricao, rendimento, margem_lucro, criado_em, atualizado_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?);`,
        values: [p.id, p.nome, p.descricao ?? '', p.rendimento, p.margemLucro, p.criadoEm, p.atualizadoEm],
      },
      { statement: 'DELETE FROM ingredientes WHERE produto_id = ?;', values: [p.id] },
      ...p.ingredientes.map<capSQLiteSet>((i, ordem) => ({
        statement: `INSERT INTO ingredientes (id, produto_id, nome, tipo, preco_base, quantidade_compra, unidade_compra, quantidade_usada, unidade_uso, ordem)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        values: [i.id, p.id, i.nome, i.tipo, i.precoBase, i.quantidadeCompra, i.unidadeCompra, i.quantidadeUsada, i.unidadeUso, ordem],
      })),
    ];
    await this.conexao().executeSet(comandos, true);
  }

  async remover(id: string): Promise<void> {
    await this.conexao().executeSet(
      [
        { statement: 'DELETE FROM ingredientes WHERE produto_id = ?;', values: [id] },
        { statement: 'DELETE FROM produtos WHERE id = ?;', values: [id] },
      ],
      true,
    );
  }

  private async migrar(): Promise<void> {
    const db = this.conexao();
    await db.execute(
      `CREATE TABLE IF NOT EXISTS migracoes (versao INTEGER PRIMARY KEY NOT NULL, aplicada_em TEXT NOT NULL);`,
    );
    const res = await db.query('SELECT COALESCE(MAX(versao), 0) AS versao FROM migracoes;');
    const atual = Number(res.values?.[0]?.versao ?? 0);

    for (const m of MIGRACOES.filter((m) => m.versao > atual).sort((a, b) => a.versao - b.versao)) {
      await db.executeSet(
        [
          ...m.comandos.map((statement) => ({ statement, values: [] })),
          {
            statement: 'INSERT INTO migracoes (versao, aplicada_em) VALUES (?, ?);',
            values: [m.versao, new Date().toISOString()],
          },
        ],
        true,
      );
    }
  }

  private conexao(): SQLiteDBConnection {
    if (!this.db) throw new Error('Banco de dados não inicializado.');
    return this.db;
  }
}

