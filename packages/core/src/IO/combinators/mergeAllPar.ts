import * as I from "../../Iterable";
import { pure } from "../_core";
import { zipWithPar_ } from "../apply-par";
import type { IO } from "../model";

/**
 * Merges an `Iterable<IO>` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllPar_ = <R, E, A, B>(
  fas: Iterable<IO<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): IO<R, E, B> => I.reduce_(fas, pure(b) as IO<R, E, B>, (b, a) => zipWithPar_(b, a, f));

/**
 * Merges an `Iterable<IO>` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllPar = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<IO<R, E, A>>
): IO<R, E, B> => mergeAllPar_(fas, b, f);
