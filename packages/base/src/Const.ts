import type { Eq } from './Eq'
import type { ConstURI } from './Modules'
import type { Show } from './Show'
import type * as P from './typeclass'

import { identity, tuple, unsafeCoerce } from './Function'
import * as HKT from './HKT'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type Const<E, A> = E & { readonly _A: A }

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export function make<E, A = never>(e: E): Const<E, A> {
  return unsafeCoerce(e)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplicative<E>(M: P.Monoid<E>): P.Applicative<[HKT.URI<ConstURI>], HKT.Fix<'E', E>> {
  return HKT.instance<P.Applicative<[HKT.URI<ConstURI>], HKT.Fix<'E', E>>>({
    ...getApply(M),
    pure: () => make(M.nat),
    unit: () => make(M.nat)
  })
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * @category Apply
 * @since 1.0.0
 */
export function getApply<E>(S: P.Semigroup<E>) {
  type CE = HKT.Fix<'E', E>
  const crossWith_: P.Apply<[HKT.URI<ConstURI>], CE>['crossWith_'] = (fa, fb, _) => make(S.combine_(fa, fb))
  return HKT.instance<P.Apply<[HKT.URI<ConstURI>], CE>>({
    map_,
    map,
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
    cross_: (fa, fb) => crossWith_(fa, fb, tuple),
    cross: (fb) => (fa) => crossWith_(fa, fb, tuple),
    ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
    ap: (fa) => (fab) => crossWith_(fab, fa, (f, a) => f(a))
  })
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<E, A, D, B>(pab: Const<E, A>, f: (e: E) => D, _: (a: A) => B): Const<D, B> {
  return make(f(pab))
}

export function bimap<E, A, D, B>(f: (e: E) => D, g: (a: A) => B): (pab: Const<E, A>) => Const<D, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<E, A, D>(pab: Const<E, A>, f: (e: E) => D): Const<D, A> {
  return make(f(pab))
}

export function mapLeft<E, D>(f: (e: E) => D): <A>(pab: Const<E, A>) => Const<D, A> {
  return (pab) => make(f(pab))
}

/*
 * -------------------------------------------
 * Bounded
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getBounded<E, A>(B: P.Bounded<E>): P.Bounded<Const<E, A>> {
  return identity(B) as any
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<E, A, B>(fa: Const<E, A>, _: (b: B) => A): Const<E, B> {
  return unsafeCoerce(fa)
}

export function contramap<A, B>(_: (b: B) => A): <E>(fa: Const<E, A>) => Const<E, B> {
  return unsafeCoerce
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

/**
 * @category Eq
 * @since 1.0.0
 */
export function getEq<E, A>(E: Eq<E>): Eq<Const<E, A>> {
  return identity(E)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: Const<E, A>, _: (a: A) => B): Const<E, B> {
  return unsafeCoerce(fa)
}

export function map<A, B>(_: (a: A) => B): <E>(fa: Const<E, A>) => Const<E, B> {
  return unsafeCoerce
}

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

/**
 * @category Monoid
 * @since 1.0.0
 */
export function getMonoid<E, A>(M: P.Monoid<E>): P.Monoid<Const<E, A>> {
  return identity(M) as any
}

/*
 * -------------------------------------------
 * Ord
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getOrd<E, A>(O: P.Ord<E>): P.Ord<Const<E, A>> {
  return identity(O) as any
}

/*
 * -------------------------------------------
 * Ring
 * -------------------------------------------
 */

/**
 * @category Ring
 * @since 1.0.0
 */
export function getRing<E, A>(S: P.Ring<E>): P.Ring<Const<E, A>> {
  return identity(S) as any
}

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

/**
 * @category Semigroup
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<E>): P.Semigroup<Const<E, A>> {
  return identity(S) as any
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

/**
 * @category Show
 * @since 1.0.0
 */
export function getShow<E, A>(S: Show<E>): Show<Const<E, A>> {
  return {
    show: (c) => `Const(${S.show(c)})`
  }
}

export { ConstURI } from './Modules'
