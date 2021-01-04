import type { RuntimeFiber } from '../../Fiber'
import type { IO } from '../core'

import { pipe } from '@principia/base/data/Function'

import * as Supervisor from '../../Supervisor'
import { flatMap } from '../core'
import { ensuring } from './ensuring'
import { supervised } from './supervised'

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ensuringChildren_<R, E, A, R1>(
  io: IO<R, E, A>,
  children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => IO<R1, never, any>
): IO<R & R1, E, A> {
  return pipe(
    Supervisor.track,
    flatMap((s) =>
      pipe(
        io,
        supervised(s),
        ensuring(
          pipe(
            s.value,
            flatMap((fiber) => children(fiber))
          )
        )
      )
    )
  )
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ensuringChildren<R1>(
  children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => IO<R1, never, any>
): <R, E, A>(io: IO<R, E, A>) => IO<R & R1, E, A> {
  return (io) => ensuringChildren_(io, children)
}
