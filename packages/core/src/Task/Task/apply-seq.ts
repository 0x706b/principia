import { map_ } from "./functor";
import type { Task } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Sequential Apply Task
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
export function ap_<Q, D, A, B, R, E>(fab: Task<Q, D, (a: A) => B>, fa: Task<R, E, A>): Task<Q & R, D | E, B> {
   return chain_(fab, (ab) => map_(fa, ab));
}

/**
 * ```haskell
 * ap :: Apply f => f (a -> b) -> f a -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<R, E, A>(fa: Task<R, E, A>): <Q, D, B>(fab: Task<Q, D, (a: A) => B>) => Task<Q & R, E | D, B> {
   return (fab) => ap_(fab, fa);
}

export function apFirst_<R, E, A, Q, D, B>(fa: Task<R, E, A>, fb: Task<Q, D, B>): Task<Q & R, D | E, A> {
   return chain_(fa, (a) => map_(fb, () => a));
}

export function apFirst<Q, D, B>(fb: Task<Q, D, B>): <R, E, A>(fa: Task<R, E, A>) => Task<Q & R, D | E, A> {
   return (fa) => apFirst_(fa, fb);
}

/**
 * ```haskell
 * _apSecond :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond_<R, E, A, Q, D, B>(fa: Task<R, E, A>, fb: Task<Q, D, B>): Task<Q & R, D | E, B> {
   return ap_(
      map_(fa, () => (b: B) => b),
      fb
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
export function apSecond<Q, D, B>(fb: Task<Q, D, B>): <R, E, A>(fa: Task<R, E, A>) => Task<Q & R, D | E, B> {
   return (fa) => apSecond_(fa, fb);
}

export const andThen_ = apSecond_;
export const andThen = apSecond;

export function mapBoth_<R, E, A, Q, D, B, C>(
   fa: Task<R, E, A>,
   fb: Task<Q, D, B>,
   f: (a: A, b: B) => C
): Task<Q & R, D | E, C> {
   return chain_(fa, (ra) => map_(fb, (rb) => f(ra, rb)));
}

export function mapBoth<A, Q, D, B, C>(
   fb: Task<Q, D, B>,
   f: (a: A, b: B) => C
): <R, E>(fa: Task<R, E, A>) => Task<Q & R, D | E, C> {
   return (fa) => mapBoth_(fa, fb, f);
}
