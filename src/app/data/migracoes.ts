/**
 * Migrações do banco SQLite. Cada versão roda uma única vez, em ordem, dentro de uma transação.
 * Para alterar o esquema no futuro, ADICIONE uma nova versão no final — nunca edite uma já publicada.
 */
export interface Migracao {
  versao: number;
  descricao: string;
  comandos: string[];
}

export const MIGRACOES: Migracao[] = [
  {
    versao: 1,
    descricao: 'Tabelas de produtos e ingredientes',
    comandos: [
      `CREATE TABLE IF NOT EXISTS produtos (
        id            TEXT PRIMARY KEY NOT NULL,
        nome          TEXT NOT NULL,
        descricao     TEXT,
        rendimento    REAL NOT NULL DEFAULT 1,
        margem_lucro  REAL NOT NULL DEFAULT 0,
        criado_em     TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS ingredientes (
        id               TEXT PRIMARY KEY NOT NULL,
        produto_id       TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        nome             TEXT NOT NULL,
        tipo             TEXT NOT NULL CHECK (tipo IN ('peso', 'volume', 'unidade')),
        preco_base       REAL NOT NULL DEFAULT 0,
        quantidade_usada REAL NOT NULL DEFAULT 0,
        ordem            INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE INDEX IF NOT EXISTS idx_ingredientes_produto ON ingredientes (produto_id);`,
    ],
  },
  {
    versao: 2,
    descricao: 'Unidade selecionável na compra (kg/g, L/ml) e no uso',
    comandos: [
      `ALTER TABLE ingredientes ADD COLUMN quantidade_compra REAL NOT NULL DEFAULT 1;`,
      `ALTER TABLE ingredientes ADD COLUMN unidade_compra TEXT;`,
      `ALTER TABLE ingredientes ADD COLUMN unidade_uso TEXT;`,
      // Mantém o significado dos dados antigos: preço por 1 kg/L/un e uso em g/ml/un.
      `UPDATE ingredientes SET
         unidade_compra = CASE tipo WHEN 'peso' THEN 'kg' WHEN 'volume' THEN 'l' ELSE 'un' END,
         unidade_uso    = CASE tipo WHEN 'peso' THEN 'g'  WHEN 'volume' THEN 'ml' ELSE 'un' END
       WHERE unidade_compra IS NULL OR unidade_uso IS NULL;`,
    ],
  },
];

