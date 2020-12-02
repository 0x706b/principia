import * as A from "../../Array/_core";
import type { Predicate, Refinement } from "../../Function";
import { flow, pipe } from "../../Function";
import * as I from "../../Iterable";
import * as O from "../../Option";
import { chain_, die, fail, map, map_, pure, zipWith_ } from "../_core";
import type { IO } from "../model";
import { foreachPar } from "./foreachPar";
import { foreachParN } from "./foreachParN";

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter<A, R, E>(f: (a: A) => IO<R, E, boolean>) {
  return (as: Iterable<A>) => filter_(as, f);
}

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, boolean>
): IO<R, E, readonly A[]> {
  return I.reduce_(as, pure([]) as IO<R, E, A[]>, (ma, a) =>
    zipWith_(ma, f(a), (as_, p) => {
      if (p) {
        as_.push(a);
      }
      return as_;
    })
  );
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 */
export function filterPar_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) {
  return pipe(
    as,
    foreachPar((a) => map_(f(a), (b) => (b ? O.some(a) : O.none()))),
    map(A.compact)
  );
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 */
export function filterPar<A, R, E>(
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterPar_(as, f);
}

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

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotPar_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) {
  return filterPar_(
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
export function filterNotPar<A, R, E>(
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterNotPar_(as, f);
}

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

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R1, E1, A1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, B | A1>;
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1>;
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return chain_(fa, (a): IO<R1, E1, A | A1> => (predicate(a) ? pure(a) : or(a)));
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse<A, B extends A>(
  refinement: Refinement<A, B>
): <R1, E1, A1>(
  or: (a: A) => IO<R1, E1, A1>
) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>;
export function filterOrElse<A>(
  predicate: Predicate<A>
): <R1, E1, A1>(
  or: (a: A) => IO<R1, E1, A1>
) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>;
export function filterOrElse<A>(
  predicate: Predicate<A>
): <R1, E1, A1>(
  or: (a: A) => IO<R1, E1, A1>
) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (or) => (fa) => filterOrElse_(fa, predicate, or);
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, A, B extends A, E1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  failWith: (a: A) => E1
): IO<R, E | E1, B>;
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A>;
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A> {
  return filterOrElse_(fa, predicate, flow(failWith, fail));
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail<A, B extends A>(
  refinement: Refinement<A, B>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, B>;
export function filterOrFail<A>(
  predicate: Predicate<A>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A>;
export function filterOrFail<A>(
  predicate: Predicate<A>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A> {
  return (failWith) => (fa) => filterOrFail_(fa, predicate, failWith);
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  dieWith: (a: A) => unknown
): IO<R, E, A>;
export function filterOrDie_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  dieWith: (a: A) => unknown
): IO<R, E, A>;
export function filterOrDie_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  dieWith: (a: A) => unknown
): IO<R, E, A> {
  return filterOrElse_(fa, predicate, flow(dieWith, die));
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie<A, B extends A>(
  refinement: Refinement<A, B>
): (dieWith: (a: A) => unknown) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDie<A>(
  predicate: Predicate<A>
): (dieWith: (a: A) => unknown) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDie<A>(
  predicate: Predicate<A>
): (dieWith: (a: A) => unknown) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (dieWith) => (fa) => filterOrDie_(fa, predicate, dieWith);
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  message: (a: A) => string
): IO<R, E, A>;
export function filterOrDieMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
): IO<R, E, A>;
export function filterOrDieMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
) {
  return filterOrDie_(fa, predicate, (a) => new Error(message(a)));
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export function filterOrDieMessage<A, B extends A>(
  refinement: Refinement<A, B>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDieMessage<A>(
  predicate: Predicate<A>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDieMessage<A>(
  predicate: Predicate<A>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (message) => (fa) => filterOrDieMessage_(fa, predicate, message);
}