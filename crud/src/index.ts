export interface Crud {
  [key : string]: Provider | Database | Schema | Table
}

export interface Provider {
  [key: string]: Database | Schema | Table
}

export interface Database {
  [key: string]: Schema | Table
}

export interface Schema {
  [key: string]: Table
}

export interface Table {
  [key: string]: any
}

export function mergeCruds(...cruds: Crud[]) {
  const crud: Crud = {}

  for (const [name, provider] of cruds.flatMap(Object.entries)) {
    if (crud[name]) throw TypeError(`Duplicated provider "${name}"`)
    crud[name] = provider
  }

  promoteCrud(crud)

  return crud
}

function promoteCrud(parent: Crud | Provider | Database, level = 2) {
  if (level > 0) Object.values(parent).forEach(child => promoteCrud(child, level - 1))

  const children = Object.values(parent).flatMap(Object.entries)

  Object.entries(groupBy(children))
    .filter(([, { length }]) => length === 1)
    .forEach(([name, [child]]) => {
      parent[name] = child
    })
}

function groupBy(entries: [string, any][]): {[name: string]: any[]} {
  const result = {}
  for (const [name, entry] of entries) {
    result[name] = (result[name] ?? []).concat([entry])
  }
  return result
}
