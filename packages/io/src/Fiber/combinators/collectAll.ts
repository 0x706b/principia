import type { Fiber } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import { none, some } from '@principia/base/Option'
import * as O from '@principia/base/Option'

import * as C from '../../Cause'
import * as Ex from '../../Exit'
import { makeSynthetic } from '../core'
import * as I from '../internal/io'
import { awaitAll } from './awaitAll'

/**
 * ```haskell
 * collectAll :: Fiber f => Iterable (f e a) -> f e [a]
 * ```
 *
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export const collectAll = <E, A>(fibers: Iterable<Fiber<E, A>>) =>
  makeSynthetic({
    _tag: 'SyntheticFiber',
    getRef: (ref) =>
      I.foldl_(fibers, ref.initial, (a, fiber) =>
        pipe(
          fiber.getRef(ref),
          I.map((a2) => ref.join(a, a2))
        )
      ),
    inheritRefs: I.foreachUnit_(fibers, (f) => f.inheritRefs),
    interruptAs: (fiberId) =>
      pipe(
        I.foreach_(fibers, (f) => f.interruptAs(fiberId)),
        I.map(
          A.foldr(Ex.succeed(A.empty) as Ex.Exit<E, ReadonlyArray<A>>, (a, b) =>
            Ex.map2Cause_(a, b, (_a, _b) => [_a, ..._b], C.both)
          )
        )
      ),
    poll: pipe(
      I.foreach_(fibers, (f) => f.poll),
      I.map(
        A.foldr(some(Ex.succeed(A.empty) as Ex.Exit<E, readonly A[]>), (a, b) =>
          O.fold_(
            a,
            () => none(),
            (ra) =>
              O.fold_(
                b,
                () => none(),
                (rb) => some(Ex.map2Cause_(ra, rb, (_a, _b) => [_a, ..._b], C.both))
              )
          )
        )
      )
    ),
    await: awaitAll(fibers)
  })
