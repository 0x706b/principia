import * as A from "../../Array/_core";
import { pipe } from "../../Function";
import * as O from "../../Option";
import { map, map_ } from "../_core";
import type { IO } from "../model";
import { foreachParN } from "./foreachParN";

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 */
export function filterParN_(
  n: number
): <A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) => IO<R, E, readonly A[]> {
  return (as, f) =>
    pipe(
      as,
      foreachParN(n)((a) => map_(f(a), (b) => (b ? O.some(a) : O.none()))),
      map(A.compact)
    );
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 */
export function filterParN(
  n: number
): <A, R, E>(f: (a: A) => IO<R, E, boolean>) => (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (f) => (as) => filterParN_(n)(as, f);
}
