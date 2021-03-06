import type { Cause } from '../Cause'
import type { Chunk } from '../Chunk'
import type { Managed } from '../Managed'
import type * as O from '@principia/base/Option'

import * as E from '@principia/base/Either'

import * as C from '../Chunk'
import * as I from '../IO'
import * as XR from '../IORef'
import * as M from '../Managed'

export type Push<R, E, I, L, Z> = (
  _: O.Option<Chunk<I>>
) => I.IO<R, readonly [E.Either<E, Z>, Chunk<L>], void>

export function emit<I, Z>(z: Z, leftover: Chunk<I>): I.FIO<[E.Either<never, Z>, Chunk<I>], never> {
  return I.fail([E.Right(z), leftover])
}

export const more = I.unit()

export function fail<E, I>(e: E, leftover: Chunk<I>): I.FIO<[E.Either<E, never>, Chunk<I>], never> {
  return I.fail([E.Left(e), leftover])
}

export function halt<E>(c: Cause<E>): I.FIO<[E.Either<E, never>, Chunk<never>], never> {
  return I.mapError_(I.halt(c), (e) => [E.Left(e), C.empty()])
}

export function restartable<R, E, I, L, Z>(
  sink: Managed<R, never, Push<R, E, I, L, Z>>
): Managed<R, never, readonly [Push<R, E, I, L, Z>, I.URIO<R, void>]> {
  return M.gen(function* (_) {
    const switchSink  = yield* _(M.switchable<R, never, Push<R, E, I, L, Z>>())
    const initialSink = yield* _(switchSink(sink))
    const currSink    = yield* _(XR.make(initialSink))

    const restart = I.bind_(switchSink(sink), currSink.set)
    const push    = (input: O.Option<Chunk<I>>) => I.bind_(currSink.get, (f) => f(input))

    return [push, restart]
  })
}
