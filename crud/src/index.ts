import type { Operation } from '@cuillere/core'

export interface Crud {
  [key : string]: Provider
}

export interface Provider {
  [key: string]: Database
}

export interface Database {
  [key: string]: Schema
}

export interface Schema {
  [key: string]: Table
}

export interface Table {
  [key: string]: (...args: any[]) => Operation
}

export interface PromotedCrud {
  [key : string]: Provider | Database | Schema | Table
}

export interface PromotedProvider {
  [key: string]: Database | Schema | Table
}

export interface PromotedDatabase {
  [key: string]: Schema | Table
}

export function mergeCruds(...cruds: Crud[]): PromotedCrud {
  const crud: Crud = {}

  for (const [name, provider] of cruds.flatMap(Object.entries)) {
    if (crud[name]) throw TypeError(`Duplicated provider "${name}"`)
    crud[name] = provider
  }

  promoteCrud(crud)

  return crud
}

function promoteCrud(parent: Crud | Provider | Database, level = 2) {
  const children = Object.values(parent)
  if (level > 0) children.forEach(child => promoteCrud(child, level - 1))

  const childrenFields = children.flatMap(Object.entries)

  groupByName(childrenFields)
    // We promote only fields when there is no duplicates
    .filter(([, { length }]) => length === 1)
    // We promote only fields if it is not already present in the parent
    .filter(([name]) => !parent[name])
    .forEach(([name, [child]]) => {
      parent[name] = child
    })
}

function groupByName<Entity = any>(entries: [string, Entity][]): [string, Entity[]][] {
  const result = {}
  for (const [name, entry] of entries) {
    result[name] = (result[name] ?? []).concat([entry])
  }
  return Object.entries(result)
}
