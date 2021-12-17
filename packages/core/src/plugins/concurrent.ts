import { fork, Effect, Operation } from '../operations'
import { Task } from '../stack'
import { Plugin } from './plugin'

export interface Concurrent extends Operation {
  effects: Iterable<Effect>
}

const namespace = '@cuillere/concurrent'

export const concurrentPlugin = (): Plugin => ({
  namespace,

  handlers: {
    async* all({ effects }: Concurrent) {
      const tasks: Task[] = []
      for (const effect of effects) tasks.push(yield fork(effect))

      try {
        return await Promise.all(tasks.map(({ result }) => result))
      } catch (error) {
        const results = await Promise.allSettled(tasks.map(task => task.cancel()))
        error.errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(({ reason }) => reason)
          .filter(reason => reason !== error)
        throw error
      }
    },

    async* allSettled({ effects }: Concurrent) {
      const tasks = []
      for (const effect of effects) tasks.push(yield fork(effect))
      return Promise.allSettled(tasks.map(({ result }) => result))
    },
  },
})

function concurrent(kind: string) {
  const nsKind = `${namespace}/${kind}`

  const fn = {
    // Set the function name
    [kind](effects: Iterable<Effect>): Concurrent {
      return { kind: nsKind, effects }
    },
  }
  return fn[kind]
}

export const all = concurrent('all')
export const allSettled = concurrent('allSettled')
