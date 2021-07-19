
export function promoteCrud<T>(parent: T, levels = 2): T {
  const children = Object.values(parent)

  if (levels > 0) children.forEach(child => promoteCrud(child, levels - 1))

  const childrenFields = children.flatMap(Object.entries)

  groupByName(childrenFields)
    // We promote only fields if it is not already present in the parent
    .filter(([name]) => !parent[name])
    // We promote only fields when there is no duplicates
    .filter(([, { length }]) => length === 1)
    .forEach(([name, [child]]) => {
      parent[name] = child
    })

  return parent
}

function groupByName<T = any>(entries: [string, T][]): [string, T[]][] {
  const result: { [k: string]: T[] } = {}
  for (const [name, entry] of entries) {
    if (!(name in result)) result[name] = []
    result[name].push(entry)
  }
  return Object.entries(result)
}
