import type { Either } from "../Either";
import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import type { Option } from "./Option";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * nothing :: <a> () -> Nothing
 * ```
 *
 * Constructs a new `Maybe` holding no value (a.k.a `Nothing`)
 *
 * @category Constructors
 * @since 1.0.0
 */
export const none = <A = never>(): Option<A> => ({
   _tag: "None"
});

/**
 * ```haskell
 * just :: a -> Just a
 * ```
 *
 * Constructs a new `Maybe` holding a `Just` value.
 *
 * @category Constructs
 * @since 1.0.0
 */
export const some = <A>(a: A): Option<A> => ({
   _tag: "Some",
   value: a
});

/**
 * ```haskell
 * fromNullable :: ?a -> Maybe a
 * ```
 *
 * Constructs a new `Maybe` from a nullable value. If the value is `null` or `undefined`, returns `Nothing`, otherwise
 * returns the value wrapped in a `Just`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromNullable = <A>(a: A | null | undefined): Option<NonNullable<A>> =>
   a == null ? none() : some(a as NonNullable<A>);

/**
 * ```haskell
 * partial :: (() -> a) -> Maybe a
 * ```
 *
 * Constructs a new `Maybe` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export const partial = <A>(thunk: Lazy<A>): Option<A> => {
   try {
      return some(thunk());
   } catch (_) {
      return none();
   }
};

/**
 * ```haskell
 * partialK :: ((a, b, ...) -> c) -> ((a, b, ...) -> Maybe c)
 * ```
 *
 * Transforms a non-curried function that may throw, takes a set of arguments `(a, b, ...)`, and returns a value `c`, into a non-curried function that will not throw, takes a set of arguments `(a, b, ...)`, and returns a `Maybe`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const partialK = <A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, B>): ((...args: A) => Option<B>) => (
   ...a
) => partial(() => f(...a));

/**
 * ```haskell
 * fromPredicate_ :: (a, (a -> is b)) -> Maybe b
 * fromPredicate_ :: (a, (a -> Boolean)) -> Maybe a
 * ```
 *
 * Constructs a new `Maybe` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate_: {
   <A, B extends A>(a: A, refinement: Refinement<A, B>): Option<A>;
   <A>(a: A, predicate: Predicate<A>): Option<A>;
} = <A>(a: A, predicate: Predicate<A>): Option<A> => (predicate(a) ? none() : some(a));

/**
 * ```haskell
 * fromPredicate :: (a -> is b) -> a -> Maybe b
 * fromPredicate :: (a -> Boolean) -> a -> Maybe a
 * ```
 *
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate: {
   <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<A>;
   <A>(predicate: Predicate<A>): (a: A) => Option<A>;
} = <A>(predicate: Predicate<A>) => (a: A) => fromPredicate_(a, predicate);

/**
 * ```haskell
 * fromEither :: Either e a -> Maybe a
 * ```
 *
 * Constructs a new `Maybe` from an `Either`, transforming a `Left` into a `Nothing` and a `Right` into a `Just`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromEither = <E, A>(ma: Either<E, A>): Option<A> => (ma._tag === "Left" ? none() : some(ma.right));