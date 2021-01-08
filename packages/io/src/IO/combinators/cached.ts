import type { HasClock } from '../../Clock'
import type { Promise } from '../../Promise'
import type { FIO, IO, URIO } from '../core'
import type { Option } from '@principia/base/data/Option'

import { pipe, tuple } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import { currentTime } from '../../Clock'
import * as RefM from '../../IORefM'
import * as P from '../../Promise'
import * as I from '../core'
import { uninterruptibleMask } from './interrupt'
import { to } from './to'

const _compute = <R, E, A>(fa: IO<R, E, A>, ttl: number, start: number) =>
  pipe(
    I.do,
    I.bindS('p', () => P.make<E, A>()),
    I.tap(({ p }) => to(p)(fa)),
    I.map(({ p }) => O.some(tuple(start + ttl, p)))
  )

const _get = <R, E, A>(fa: IO<R, E, A>, ttl: number, cache: RefM.URefM<Option<readonly [number, Promise<E, A>]>>) =>
  uninterruptibleMask(({ restore }) =>
    pipe(
      currentTime,
      I.flatMap((time) =>
        pipe(
          cache,
          RefM.updateSomeAndGet((o) =>
            pipe(
              o,
              O.fold(
                () => O.some(_compute(fa, ttl, time)),
                ([end]) =>
                  end - time <= 0
                    ? O.some(_compute(fa, ttl, time))
                    : O.none<IO<R, never, Option<readonly [number, P.Promise<E, A>]>>>()
              )
            )
          ),
          I.flatMap((a) => (a._tag === 'None' ? I.die('bug') : restore(a.value[1].await)))
        )
      )
    )
  )

/**
 * ```haskell
 * cached_ :: (IO r e a, Number) -> IO (r & HasClock) _ (t ^ _ e a)
 * ```
 *
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function cached_<R, E, A>(fa: IO<R, E, A>, timeToLive: number): URIO<R & HasClock, FIO<E, A>> {
  return pipe(
    I.do,
    I.bindS('r', () => I.ask<R & HasClock>()),
    I.bindS('cache', () => RefM.make<Option<readonly [number, Promise<E, A>]>>(O.none())),
    I.map(({ cache, r }) => I.giveAll(r)(_get(fa, timeToLive, cache)))
  )
}

/**
 * ```haskell
 * cached :: Number -> IO r e a -> IO (r & HasClock) _ (IO _ e a)
 * ```
 *
 * Returns an IO that, if evaluated, will return the cached result of
 * this IO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function cached(timeToLive: number): <R, E, A>(fa: I.IO<R, E, A>) => URIO<R & HasClock, FIO<E, A>> {
  return <R, E, A>(fa: IO<R, E, A>) => cached_(fa, timeToLive)
}
