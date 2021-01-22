import { identity } from './Function'
import * as HKT from './HKT'
import * as P from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Tuple2<A, B> extends Readonly<[A, B]> {}

export const URI = 'T2'
export type URI = typeof URI

export type V = HKT.V<'I', '+'>

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Tuple2<A, I>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function tuple_<A, I>(a: A, i: I): Tuple2<A, I> {
  return [a, i]
}

export function tuple<I>(i: I): <A>(a: A) => Tuple2<A, I> {
  return (a) => [a, i]
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export function fst<A, I>(ai: Tuple2<A, I>): A {
  return ai[0]
}

export function snd<A, I>(ai: Tuple2<A, I>): I {
  return ai[1]
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function getApplicative<M>(M: P.Monoid<M>): P.Applicative<[URI], V & HKT.Fix<'I', M>> {
  return HKT.instance({
    ...getApply(M),
    pure: (a) => tuple_(a, M.nat),
    unit: () => tuple_(undefined, M.nat)
  })
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function getApply<M>(M: P.Monoid<M>): P.Apply<[URI], V & HKT.Fix<'I', M>> {
  const map2_: P.Map2Fn_<[URI], HKT.Fix<'I', M>> = (fa, fb, f) => [f(fst(fa), fst(fb)), M.combine_(snd(fa), snd(fb))]
  const ap_: P.ApFn_<[URI], V & HKT.Fix<'I', M>> = (fab, fa) => [fst(fab)(fst(fa)), M.combine_(snd(fab), snd(fa))]

  return HKT.instance<P.Apply<[URI], V & HKT.Fix<'I', M>>>({
    invmap_: (fa, f, _) => map_(fa, f),
    invmap: (f, _) => (fa) => map_(fa, f),
    map_,
    map,
    map2_,
    map2: (fb, f) => (fa) => map2_(fa, fb, f),
    product_: (fa, fb) => map2_(fa, fb, tuple_),
    product: (fb) => (fa) => map2_(fa, fb, tuple_),
    ap_,
    ap: (fa) => (fab) => ap_(fab, fa)
  })
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<A, I, G, B>(pab: Tuple2<A, I>, f: (i: I) => G, g: (a: A) => B): Tuple2<B, G> {
  return [g(fst(pab)), f(snd(pab))]
}

export function bimap<I, G, A, B>(f: (i: I) => G, g: (a: A) => B): (pab: Tuple2<A, I>) => Tuple2<B, G> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<A, I, G>(pab: Tuple2<A, I>, f: (i: I) => G): Tuple2<A, G> {
  return [fst(pab), f(snd(pab))]
}

export function mapLeft<I, G>(f: (i: I) => G): <A>(pab: Tuple2<A, I>) => Tuple2<A, G> {
  return (pab) => mapLeft_(pab, f)
}

export function swap<A, I>(ai: Tuple2<A, I>): Tuple2<I, A> {
  return [snd(ai), fst(ai)]
}

/*
 * -------------------------------------------
 * Comonad
 * -------------------------------------------
 */

export function extend_<A, I, B>(wa: Tuple2<A, I>, f: (wa: Tuple2<A, I>) => B): Tuple2<B, I> {
  return [f(wa), snd(wa)]
}

export function extend<A, I, B>(f: (wa: Tuple2<A, I>) => B): (wa: Tuple2<A, I>) => Tuple2<B, I> {
  return (wa) => extend_(wa, f)
}

export const extract: <A, I>(wa: Tuple2<A, I>) => A = fst

export const duplicate: <A, I>(wa: Tuple2<A, I>) => Tuple2<Tuple2<A, I>, I> = extend(identity)

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldl_<A, I, B>(fa: Tuple2<A, I>, b: B, f: (b: B, a: A) => B): B {
  return f(b, fst(fa))
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <I>(fa: Tuple2<A, I>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldMap_<M>(_M: P.Monoid<M>): <A, I>(fa: Tuple2<A, I>, f: (a: A) => M) => M {
  return (fa, f) => f(fst(fa))
}

export function foldMap<M>(_M: P.Monoid<M>): <A>(f: (a: A) => M) => <I>(fa: Tuple2<A, I>) => M {
  return (f) => (fa) => foldMap_(_M)(fa, f)
}

export function foldr_<A, I, B>(fa: Tuple2<A, I>, b: B, f: (a: A, b: B) => B): B {
  return f(fst(fa), b)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <I>(fa: Tuple2<A, I>) => B {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, I, B>(fa: Tuple2<A, I>, f: (a: A) => B): Tuple2<B, I> {
  return [f(fst(fa)), snd(fa)]
}

export function map<A, B>(f: (a: A) => B): <I>(fa: Tuple2<A, I>) => Tuple2<B, I> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function getMonad<M>(M: P.Monoid<M>): P.Monad<[URI], V & HKT.Fix<'I', M>> {
  const bind_: P.BindFn_<[URI], V & HKT.Fix<'I', M>> = (ma, f) => {
    const mb = f(fst(ma))
    return [fst(mb), M.combine_(snd(ma), snd(mb))]
  }
  const flatten: P.FlattenFn<[URI], V & HKT.Fix<'I', M>> = (mma) =>
    [fst(fst(mma)), M.combine_(snd(fst(mma)), snd(mma))] as const

  return HKT.instance<P.Monad<[URI], V & HKT.Fix<'I', M>>>({
    ...getApplicative(M),
    bind_: bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten
  })
}

/*
 * -------------------------------------------
 * Semigroupoid
 * -------------------------------------------
 */

export function compose_<B, A, C>(ab: Tuple2<B, A>, bc: Tuple2<C, B>): Tuple2<C, A> {
  return [fst(bc), snd(ab)]
}

export function compose<C, B>(bc: Tuple2<C, B>): <A>(ab: Tuple2<B, A>) => Tuple2<C, A> {
  return (ab) => compose_(ab, bc)
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<[URI], V>()((_) => (G) => (ta, f) =>
  G.map_(f(fst(ta)), (b) => [b, snd(ta)])
)

export const traverse: P.TraverseFn<[URI], V> = (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence: P.SequenceFn<[URI], V> = P.implementSequence<[URI]>()((_) => (G) => (ta) =>
  G.map_(fst(ta), (a) => [a, snd(ta)])
)
