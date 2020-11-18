import { chain, chain_, mapBoth_, pure } from "../_core";
import { pipe } from "../../../Function";
import * as I from "../../../Iterable";
import * as XR from "../../XRef";
import { mapBothPar_ } from "../apply-par";
import type { Task } from "../model";
import { foreachUnitParN_ } from "./foreachUnitParN";

/**
 * Merges an `Iterable<Task>` to a single Task, working sequentially.
 */
export const mergeAll_ = <R, E, A, B>(
  fas: Iterable<Task<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Task<R, E, B> => I.reduce_(fas, pure(b) as Task<R, E, B>, (_b, a) => mapBoth_(_b, a, f));

/**
 * Merges an `Iterable<Task>` to a single IO, working sequentially.
 */
export const mergeAll = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<Task<R, E, A>>
): Task<R, E, B> => mergeAll_(fas, b, f);

/**
 * Merges an `Iterable<Task>` to a single Task, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllPar_ = <R, E, A, B>(
  fas: Iterable<Task<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Task<R, E, B> => I.reduce_(fas, pure(b) as Task<R, E, B>, (b, a) => mapBothPar_(b, a, f));

/**
 * Merges an `Iterable<Task>` to a single Task, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllPar = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<Task<R, E, A>>
): Task<R, E, B> => mergeAllPar_(fas, b, f);

/**
 * Merges an `Iterable<Task>` to a single Task, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllParN_ = (n: number) => <R, E, A, B>(
  fas: Iterable<Task<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Task<R, E, B> =>
  chain_(XR.makeRef(b), (acc) =>
    chain_(
      foreachUnitParN_(n)(
        fas,
        chain((a) =>
          pipe(
            acc,
            XR.update((b) => f(b, a))
          )
        )
      ),
      () => acc.get
    )
  );

/**
 * Merges an `Iterable<Task>` to a single Task, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllParN = (n: number) => <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<Task<R, E, A>>
): Task<R, E, B> => mergeAllParN_(n)(fas, b, f);
