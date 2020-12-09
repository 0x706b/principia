import { flow } from "../../Function";
import { map } from "../_core";
import type { IO } from "../model";
import { filterParN_ } from "./filterParN";

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotParN_(
  n: number
): <A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) => IO<R, E, readonly A[]> {
  return (as, f) =>
    filterParN_(n)(
      as,
      flow(
        f,
        map((b) => !b)
      )
    );
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotParN(
  n: number
): <A, R, E>(f: (a: A) => IO<R, E, boolean>) => (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (f) => (as) => filterNotParN_(n)(as, f);
}
