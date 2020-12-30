import type { FIO } from '../../IO/core'
import type { Promise } from '../model'

import { Done } from '../model'

/**
 * Unsafe version of done
 */
export function unsafeDone<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>) => {
    const state = promise.state.get

    if (state._tag === 'Pending') {
      promise.state.set(new Done(io))

      Array.from(state.joiners)
        .reverse()
        .forEach((f) => {
          f(io)
        })
    }
  }
}
