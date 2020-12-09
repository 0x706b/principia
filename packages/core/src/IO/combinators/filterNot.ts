import { flow } from "../../Function";
import { map } from "../_core";
import type { IO } from "../model";
import { filter_ } from "./filter";

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 */
export function filterNot_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) {
  return filter_(
    as,
    flow(
      f,
      map((b) => !b)
    )
  );
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 */
export function filterNot<A, R, E>(
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterNot_(as, f);
}
