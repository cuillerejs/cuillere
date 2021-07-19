export interface TableInfo {
  pool: string
  schema: string
  table: string
  columns: {name: string; type: string}[]
  primaryKey: string[]
}
