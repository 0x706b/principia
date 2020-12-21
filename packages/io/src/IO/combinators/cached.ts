import type { HasClock } from "../../Clock";
import type { Promise } from "../../Promise";
import type { FIO, IO, URIO } from "../core";
import type { Option } from "@principia/base/data/Option";

import { pipe, tuple } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { currentTime } from "../../Clock";
import * as XRM from "../../IORefM";
import * as XP from "../../Promise";
import * as I from "../core";
import { uninterruptibleMask } from "./interrupt";
import { to } from "./to";

const _compute = <R, E, A>(fa: IO<R, E, A>, ttl: number, start: number) =>
  pipe(
    I.do,
    I.bindS("p", () => XP.make<E, A>()),
    I.tap(({ p }) => to(p)(fa)),
    I.map(({ p }) => O.some(tuple(start + ttl, p)))
  );

const _get = <R, E, A>(
  fa: IO<R, E, A>,
  ttl: number,
  cache: XRM.URefM<Option<readonly [number, Promise<E, A>]>>
) =>
  uninterruptibleMask(({ restore }) =>
    pipe(
      currentTime,
      I.flatMap((time) =>
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
                    : O.none<IO<R, never, Option<readonly [number, XP.Promise<E, A>]>>>()
              )
            )
          ),
          I.flatMap((a) => (a._tag === "None" ? I.die("bug") : restore(XP.await(a.value[1]))))
        )
      )
    )
  );

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
export function cached_<R, E, A>(
  fa: IO<R, E, A>,
  timeToLive: number
): URIO<R & HasClock, FIO<E, A>> {
  return pipe(
    I.do,
    I.bindS("r", () => I.ask<R & HasClock>()),
    I.bindS("cache", () => XRM.make<Option<readonly [number, Promise<E, A>]>>(O.none())),
    I.map(({ cache, r }) => I.giveAll(r)(_get(fa, timeToLive, cache)))
  );
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
export function cached(
  timeToLive: number
): <R, E, A>(fa: I.IO<R, E, A>) => URIO<R & HasClock, FIO<E, A>> {
  return <R, E, A>(fa: IO<R, E, A>) => cached_(fa, timeToLive);
}
