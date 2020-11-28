import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { bind_, flow, pipe } from "../Function";
import * as X from "../XPure";
import { zip_ } from "./applicative";
import { Functor, map, map_ } from "./functor";
import type { IO, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: IO<(a: A) => B>, fa: IO<A>): IO<B> {
  return map_(X.zip_(fab, fa), ([f, a]) => f(a));
}

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<A>(fa: IO<A>): <B>(fab: IO<(a: A) => B>) => IO<B> {
  return (fab) => ap_(fab, fa);
}

/**
 * ```haskell
 * apFirst_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apFirst_<A, B>(fa: IO<A>, fb: IO<B>): IO<A> {
  return pipe(
    fa,
    map((a) => () => a),
    ap(fb)
  );
}

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apFirst<B>(fb: IO<B>): <A>(fa: IO<A>) => IO<A> {
  return (fa) => apFirst_(fa, fb);
}

/**
 * ```haskell
 * apSecond_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond_<A, B>(fa: IO<A>, fb: IO<B>): IO<B> {
  return pipe(
    fa,
    map(() => (b: B) => b),
    ap(fb)
  );
}

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond<B>(fb: IO<B>): <A>(fa: IO<A>) => IO<B> {
  return (fa) => apSecond_(fa, fb);
}

/**
 * ```haskell
 * zipWith_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `IO`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const zipWith_: <A, B, C>(fa: IO<A>, fb: IO<B>, f: (a: A, b: B) => C) => IO<C> = X.zipWith_;

/**
 * ```haskell
 * zipWith :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `IO`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipWith<A, B, C>(fb: IO<B>, f: (a: A, b: B) => C): (fa: IO<A>) => IO<C> {
  return (fa) => zipWith_(fa, fb, f);
}

/**
 * ```haskell
 * lift2 :: Apply f => (a -> b -> c) -> f a -> f b -> f c
 * ```
 *
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (fa: IO<A>) => (fb: IO<B>) => IO<C> {
  return (fa) => (fb) => map_(zip_(fa, fb), ([a, b]) => f(a)(b));
}

/**
 * ```haskell
 * apS :: (Apply f, Nominal n) =>
 *    (n n3, f c)
 *    -> f ({ n1: a, n2: b, ... })
 *    -> f ({ n1: a, n2: b, n3: c })
 * ```
 *
 * A pipeable version of `struct`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apS<N extends string, A, B>(
  name: Exclude<N, keyof A>,
  fb: IO<B>
): (
  fa: IO<A>
) => IO<
  {
    [K in keyof A | N]: K extends keyof A ? A[K] : B;
  }
> {
  return flow(
    map((a) => (b: B) => bind_(a, name, b)),
    ap(fb)
  );
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_: ap_,
  ap,
  zipWith_,
  zipWith
});
