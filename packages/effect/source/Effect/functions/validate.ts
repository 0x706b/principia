import * as A from "@principia/core/Array";
import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import type { NonEmptyArray } from "@principia/core/NonEmptyArray";

import type { ExecutionStrategy, Parallel, ParallelN, Sequential } from "../../ExecutionStrategy";
import { absolve, foreach_, map_ } from "../core";
import type { Effect } from "../Effect";
import { either } from "./either";
import { foreachExec_ } from "./foreachExec";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

const mergeExits = <E, B>() => (exits: ReadonlyArray<Either<E, B>>): Either<NonEmptyArray<E>, Array<B>> => {
   const errors = [] as E[];
   const results = [] as B[];

   exits.forEach((e) => {
      if (e._tag === "Left") {
         errors.push(e.left);
      } else {
         results.push(e.right);
      }
   });

   return A.isNonEmpty(errors) ? E.left(errors) : E.right(results);
};

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validate_ = <A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) =>
   absolve(
      map_(
         foreach_(as, (a) => either(f(a))),
         mergeExits<E, B>()
      )
   );

export const validate = <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (as: Iterable<A>) => validate_(as, f);

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validatePar_ = <A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) =>
   absolve(
      map_(
         foreachPar_(as, (a) => either(f(a))),
         mergeExits<E, B>()
      )
   );

export const validatePar = <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (as: Iterable<A>) => validatePar_(as, f);

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validateParN_ = (n: number) => <A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) =>
   absolve(
      map_(
         foreachParN_(n)(as, (a) => either(f(a))),
         mergeExits<E, B>()
      )
   );

export const validateParN = (n: number) => <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (as: Iterable<A>) =>
   validateParN_(n)(as, f);

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validateExec_: {
   <R, E, A, B>(es: Sequential, as: Iterable<A>, f: (a: A) => Effect<R, E, B>): Effect<
      R,
      NonEmptyArray<E>,
      ReadonlyArray<B>
   >;
   <R, E, A, B>(es: Parallel, as: Iterable<A>, f: (a: A) => Effect<R, E, B>): Effect<
      R,
      NonEmptyArray<E>,
      ReadonlyArray<B>
   >;
   <R, E, A, B>(es: ParallelN, as: Iterable<A>, f: (a: A) => Effect<R, E, B>): Effect<
      R,
      NonEmptyArray<E>,
      ReadonlyArray<B>
   >;
   <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => Effect<R, E, B>): Effect<
      R,
      NonEmptyArray<E>,
      ReadonlyArray<B>
   >;
} = <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => Effect<R, E, B>) =>
   absolve(
      map_(
         foreachExec_(es, as, (a) => either(f(a))),
         mergeExits<E, B>()
      )
   );

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 */
export const validateExec: {
   (es: Sequential): <R, E, A, B>(
      f: (a: A) => Effect<R, E, B>
   ) => (as: Iterable<A>) => Effect<R, NonEmptyArray<E>, ReadonlyArray<B>>;
   (es: Parallel): <R, E, A, B>(
      f: (a: A) => Effect<R, E, B>
   ) => (as: Iterable<A>) => Effect<R, NonEmptyArray<E>, ReadonlyArray<B>>;
   (es: ParallelN): <R, E, A, B>(
      f: (a: A) => Effect<R, E, B>
   ) => (as: Iterable<A>) => Effect<R, NonEmptyArray<E>, ReadonlyArray<B>>;
   (es: ExecutionStrategy): <R, E, A, B>(
      f: (a: A) => Effect<R, E, B>
   ) => (as: Iterable<A>) => Effect<R, NonEmptyArray<E>, ReadonlyArray<B>>;
} = (es: ExecutionStrategy) => <R, E, A, B>(f: (a: A) => Effect<R, E, B>) => (as: Iterable<A>) =>
   validateExec_(es, as, f) as any;
