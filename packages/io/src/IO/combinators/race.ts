import type { Exit } from '../../Exit'
import type { IO } from '../core'

import * as C from '../../Cause/core'
import * as Ex from '../../Exit'
import { join } from '../../Fiber/combinators/join'
import * as I from '../core'
import { raceWith_ } from './core-scope'

const mergeInterruption = <E1, A, A1>(a: A) => (x: Exit<E1, A1>): IO<unknown, E1, A> => {
  switch (x._tag) {
    case 'Success':
      return I.pure(a)
    case 'Failure':
      return C.interruptedOnly(x.cause) ? I.pure(a) : I.halt(x.cause)
  }
}

/**
 * Returns an IO that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function race_<R, E, A, R1, E1, A1>(ef: IO<R, E, A>, that: IO<R1, E1, A1>): IO<R & R1, E | E1, A | A1> {
  return I.descriptorWith((d) =>
    raceWith_(
      ef,
      that,
      (exit, right) =>
        Ex.matchM_(
          exit,
          (cause) => I.mapErrorCause_(join(right), (_) => C.both(cause, _)),
          (a) => I.bind_(right.interruptAs(d.id), mergeInterruption(a))
        ),
      (exit, left) =>
        Ex.matchM_(
          exit,
          (cause) => I.mapErrorCause_(join(left), (_) => C.both(cause, _)),
          (a) => I.bind_(left.interruptAs(d.id), mergeInterruption(a))
        )
    )
  )
}

/**
 * Returns an IO that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function race<R1, E1, A1>(that: IO<R1, E1, A1>): <R, E, A>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  return (ef) => race_(ef, that)
}
