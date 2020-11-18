import { chain, chain_, foldM, map, map_, pure } from "../_core";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { HasClock } from "../../Clock";
import type { Schedule } from "../../Schedule";
import * as S from "../../Schedule";
import type { Task } from "../model";
import { orDie } from "./orDie";

/**
 * ```haskell
 * repeatN_ :: (Task r e a, Number) -> Task r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN_<R, E, A>(ef: Task<R, E, A>, n: number): Task<R, E, A> {
  return chain_(ef, (a) => (n <= 0 ? pure(a) : repeatN_(ef, n - 1)));
}

/**
 * ```haskell
 * repeatN :: Number -> Task r e a -> Task r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN(n: number): <R, E, A>(ef: Task<R, E, A>) => Task<R, E, A> {
  return (ef) => repeatN_(ef, n);
}

/**
 * ```haskell
 * repeatOrElseEither_ :: (
 *    Task r e a,
 *    Schedule r1 a b,
 *    ((e, Option b) -> Task r2 e2 c)
 * ) -> Task (r & r1 & r2 & HasClock) e2 (Either c b)
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields a task that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatOrElseEither_<R, R1, R2, E, E2, A, B, C>(
  fa: Task<R, E, A>,
  sc: Schedule<R1, A, B>,
  f: (_: E, __: Option<B>) => Task<R2, E2, C>
): Task<R & R1 & R2 & HasClock, E2, Either<C, B>> {
  return pipe(
    S.driver(sc),
    chain((driver) => {
      function loop(a: A): Task<R & R1 & R2 & HasClock, E2, Either<C, B>> {
        return pipe(
          driver.next(a),
          foldM(
            () => pipe(orDie(driver.last), map(E.right)),
            (b) =>
              pipe(
                fa,
                foldM(
                  (e) => pipe(f(e, O.some(b)), map(E.left)),
                  (a) => loop(a)
                )
              )
          )
        );
      }
      return pipe(
        fa,
        foldM(
          (e) => pipe(f(e, O.none()), map(E.left)),
          (a) => loop(a)
        )
      );
    })
  );
}

/**
 * ```haskell
 * repeatOrElse_ :: (Task r e a, Schedule sr a b, ((e, Option b) -> Task r1 e1 c)) ->
 *    Task (r & sr & r1 & HasClock) e1 (c | b)
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields a task that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatOrElse_<R, SR, R1, E, E1, A, B, C>(
  ef: Task<R, E, A>,
  sc: S.Schedule<SR, A, B>,
  f: (_: E, __: Option<B>) => Task<R1, E1, C>
): Task<R & SR & R1 & HasClock, E1, C | B> {
  return map_(repeatOrElseEither_(ef, sc, f), E.merge);
}

/**
 * ```haskell
 * repeat_ :: (Task r e a, Schedule sr a b) -> Task (r & sr & HasClock) e b
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeat_<R, SR, E, A, B>(
  ef: Task<R, E, A>,
  sc: S.Schedule<SR, A, B>
): Task<R & SR & HasClock, E, B> {
  return repeatOrElse_(ef, sc, (e) => fail(e));
}

/**
 * ```haskell
 * repeat :: Schedule sr e a -> Task r e a -> Task (r & sr & HasClock) e b
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeat<SR, A, B>(sc: S.Schedule<SR, A, B>) {
  return <R, E>(ef: Task<R, E, A>) => repeat_(ef, sc);
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<R, E, A, R1, E1>(
  ef: Task<R, E, A>,
  f: (a: A) => Task<R1, E1, boolean>
): Task<R & R1, E | E1, A> {
  return chain_(ef, (a) => chain_(f(a), (b) => (b ? pure(a) : repeatUntilM_(ef, f))));
}

/**
 * Repeats this effect until its result satisfies the specified effectful predicate.
 */
export function repeatUntilM<A, R1, E1>(
  f: (a: A) => Task<R1, E1, boolean>
): <R, E>(ef: Task<R, E, A>) => Task<R & R1, E1 | E, A> {
  return (ef) => repeatUntilM_(ef, f);
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil_<R, E, A>(ef: Task<R, E, A>, f: (a: A) => boolean): Task<R, E, A> {
  return repeatUntilM_(ef, (a) => pure(f(a)));
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil<A>(f: (a: A) => boolean): <R, E>(ef: Task<R, E, A>) => Task<R, E, A> {
  return (ef) => repeatUntil_(ef, f);
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM_<R, E, A, R1, E1>(
  ef: Task<R, E, A>,
  f: (a: A) => Task<R1, E1, boolean>
): Task<R & R1, E | E1, A> {
  return chain_(ef, (a) => chain_(f(a), (b) => (b ? repeatWhileM_(ef, f) : pure(a))));
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM<A, R1, E1>(
  f: (a: A) => Task<R1, E1, boolean>
): <R, E>(ef: Task<R, E, A>) => Task<R & R1, E1 | E, A> {
  return (ef) => repeatWhileM_(ef, f);
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile_<R, E, A>(ef: Task<R, E, A>, f: (a: A) => boolean): Task<R, E, A> {
  return repeatWhileM_(ef, (a) => pure(f(a)));
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile<A>(f: (a: A) => boolean): <R, E>(ef: Task<R, E, A>) => Task<R, E, A> {
  return (ef) => repeatWhile_(ef, f);
}
