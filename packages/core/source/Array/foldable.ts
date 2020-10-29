import type { Monoid } from "@principia/prelude/Monoid";

/*
 * -------------------------------------------
 * Foldable Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, b, a) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, b: B, a: A) => B): B => {
   const len = fa.length;
   let r = b;
   for (let i = 0; i < len; i++) {
      r = f(i, r, fa[i]);
   }
   return r;
};

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex = <A, B>(b: B, f: (i: number, b: B, a: A) => B) => (fa: ReadonlyArray<A>): B =>
   reduceWithIndex_(fa, b, f);

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B =>
   reduceWithIndex_(fa, b, (_, b, a) => f(b, a));

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: ReadonlyArray<A>): B =>
   reduceWithIndex_(fa, b, (_, b, a) => f(b, a));

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, a: A, b: B) => B): B => {
   let r = b;
   for (let i = fa.length - 1; i >= 0; i--) {
      r = f(i, fa[i], r);
   }
   return r;
};

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex = <A, B>(b: B, f: (i: number, a: A, b: B) => B) => (fa: ReadonlyArray<A>): B =>
   reduceRightWithIndex_(fa, b, f);

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): B =>
   reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b));

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: ReadonlyArray<A>): B => reduceRight_(fa, b, f);

/**
 * ```haskell
 * foldMapWithIndex_ :: (Monoid m, FoldableWithIndex f, Index k) =>
 *    m b -> (f a, ((k, a) -> b) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldMapWithIndex_ = <M>(M: Monoid<M>) => <A>(fa: ReadonlyArray<A>, f: (i: number, a: A) => M): M =>
   reduceWithIndex_(fa, M.nat, (i, b, a) => M.combine_(b, f(i, a)));

/**
 * ```haskell
 * foldMapWithIndex :: (Monoid m, FoldableWithIndex f, Index k) =>
 *    m b -> ((k, a) -> b) -> f a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldMapWithIndex = <M>(M: Monoid<M>) => <A>(f: (i: number, a: A) => M) => (fa: ReadonlyArray<A>) =>
   foldMapWithIndex_(M)(fa, f);

/**
 * ```haskell
 * foldMap_ :: (Monoid m, Foldable f) =>
 *    m b -> (f a, (a -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldMap_ = <M>(M: Monoid<M>): (<A>(fa: ReadonlyArray<A>, f: (a: A) => M) => M) => {
   const foldMapWithIndexM_ = foldMapWithIndex_(M);
   return (fa, f) => foldMapWithIndexM_(fa, (_, a) => f(a));
};

/**
 * ```haskell
 * foldMap :: (Monoid m, Foldable f) => m b -> (a -> b) -> f a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>): M => foldMap_(M)(fa, f);
