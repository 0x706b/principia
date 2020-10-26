import type { Separated } from "@principia/prelude/Utils";

import { identity } from "../../../Function";
import * as I from "../../../Iterable";
import { foreach_, map_ } from "../core";
import type { Task } from "../model";
import { either } from "./either";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

/**
 * Feeds elements of type `A` to a function `f` that returns a task.
 * Collects all successes and failures in a separated fashion.
 */
export const partition_ = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Task<R, E, B>
): Task<R, never, Separated<Iterable<E>, Iterable<B>>> =>
   map_(
      foreach_(as, (a) => either(f(a))),
      I.partitionMap(identity)
   );

/**
 * Feeds elements of type `A` to a function `f` that returns a task.
 * Collects all successes and failures in a separated fashion.
 */
export const partition = <R, E, A, B>(f: (a: A) => Task<R, E, B>) => (
   fas: Iterable<A>
): Task<R, never, Separated<Iterable<E>, Iterable<B>>> => partition_(fas, f);

/**
 * Feeds elements of type `A` to a function `f` that returns a task.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export const partitionPar_ = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Task<R, E, B>
): Task<R, never, Separated<Iterable<E>, Iterable<B>>> =>
   map_(
      foreachPar_(as, (a) => either(f(a))),
      I.partitionMap(identity)
   );

/**
 * Feeds elements of type `A` to a function `f` that returns a task.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export const partitionPar = <R, E, A, B>(f: (a: A) => Task<R, E, B>) => (
   as: Iterable<A>
): Task<R, never, Separated<Iterable<E>, Iterable<B>>> => partitionPar_(as, f);

/**
 * Feeds elements of type `A` to a function `f` that returns a task.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export const partitionParN_ = (n: number) => <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Task<R, E, B>
): Task<R, never, Separated<Iterable<E>, Iterable<B>>> =>
   map_(
      foreachParN_(n)(as, (a) => either(f(a))),
      I.partitionMap(identity)
   );

/**
 * Feeds elements of type `A` to a function `f` that returns a task.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export const partitionParN = (n: number) => <R, E, A, B>(f: (a: A) => Task<R, E, B>) => (
   as: Iterable<A>
): Task<R, never, Separated<Iterable<E>, Iterable<B>>> => partitionParN_(n)(as, f);
