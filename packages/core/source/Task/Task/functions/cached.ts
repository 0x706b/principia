import { pipe, tuple } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { HasClock } from "../../Clock";
import { currentTime } from "../../Clock";
import type { XPromise } from "../../XPromise";
import * as XP from "../../XPromise";
import * as XRM from "../../XRefM";
import { ask, bindS, chain, die, giveAll, map, of, tap } from "../core";
import type { EIO, RIO, Task } from "../model";
import { uninterruptibleMask } from "./interrupt";
import { to } from "./to";

const _compute = <R, E, A>(fa: Task<R, E, A>, ttl: number, start: number) =>
   pipe(
      of,
      bindS("p", () => XP.make<E, A>()),
      tap(({ p }) => to(p)(fa)),
      map(({ p }) => O.some(tuple(start + ttl, p)))
   );

const _get = <R, E, A>(fa: Task<R, E, A>, ttl: number, cache: XRM.RefM<Option<readonly [number, XPromise<E, A>]>>) =>
   uninterruptibleMask(({ restore }) =>
      pipe(
         currentTime,
         chain((time) =>
            pipe(
               cache,
               XRM.updateSomeAndGet((o) =>
                  pipe(
                     o,
                     O.fold(
                        () => O.some(_compute(fa, ttl, time)),
                        ([end]) =>
                           end - time <= 0
                              ? O.some(_compute(fa, ttl, time))
                              : O.none<Task<R, never, Option<readonly [number, XP.XPromise<E, A>]>>>()
                     )
                  )
               ),
               chain((a) => (a._tag === "None" ? die("bug") : restore(XP.await(a.value[1]))))
            )
         )
      )
   );

/**
 * ```haskell
 * cached_ :: (Task r e a, Number) -> Task (r & HasClock) _ (t ^ _ e a)
 * ```
 *
 * Returns a task that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const cached_ = <R, E, A>(fa: Task<R, E, A>, timeToLive: number): RIO<R & HasClock, EIO<E, A>> =>
   pipe(
      of,
      bindS("r", () => ask<R & HasClock>()),
      bindS("cache", () => XRM.makeRefM<Option<readonly [number, XPromise<E, A>]>>(O.none())),
      map(({ cache, r }) => giveAll(r)(_get(fa, timeToLive, cache)))
   );

/**
 * ```haskell
 * cached :: Number -> Task r e a -> Task (r & HasClock) _ (Task _ e a)
 * ```
 *
 * Returns a task that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const cached = (timeToLive: number) => <R, E, A>(fa: Task<R, E, A>) => cached_(fa, timeToLive);
