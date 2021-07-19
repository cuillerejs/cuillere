import { Crud } from './crud'

export function mergeCruds(cruds: Crud[]): Crud {
  const crud: Crud = {}

  for (const [name, provider] of cruds.flatMap(Object.entries)) {
    if (crud[name]) throw TypeError(`Duplicated provider "${name}"`)
    crud[name] = provider
  }

  return crud
}
