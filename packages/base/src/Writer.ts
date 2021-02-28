import type { Endomorphism } from './Function'
import type { WriterURI } from './Modules'
import type * as P from './typeclass'

import { identity, tuple } from './Function'
import * as HKT from './HKT'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Writer<W, A> {
  (): readonly [A, W]
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function tell<W>(w: W): Writer<W, void> {
  return () => [undefined, w]
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function listen<W, A>(fa: Writer<W, A>): Writer<W, readonly [A, W]> {
  return () => {
    const [a, w] = fa()
    return [[a, w], w]
  }
}

export function pass<W, A>(fa: Writer<W, readonly [A, (w: W) => W]>): Writer<W, A> {
  return () => {
    const [[a, f], w] = fa()
    return [a, f(w)]
  }
}

export function listens_<W, A, B>(fa: Writer<W, A>, f: (w: W) => B): Writer<W, readonly [A, B]> {
  return () => {
    const [a, w] = fa()
    return [[a, f(w)], w]
  }
}

export function listens<W, B>(f: (w: W) => B): <A>(fa: Writer<W, A>) => Writer<W, readonly [A, B]> {
  return (fa) => listens_(fa, f)
}

export function censor_<W, A>(fa: Writer<W, A>, f: Endomorphism<W>): Writer<W, A> {
  return () => {
    const [a, w] = fa()
    return [a, f(w)]
  }
}

export function censor<W>(f: Endomorphism<W>): <A>(fa: Writer<W, A>) => Writer<W, A> {
  return (fa) => censor_(fa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<W, A, B>(fa: Writer<W, A>, f: (a: A) => B): Writer<W, B> {
  return () => {
    const [a, w] = fa()
    return [f(a), w]
  }
}

export function map<A, B>(f: (a: A) => B): <W>(fa: Writer<W, A>) => Writer<W, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor: P.Functor<[HKT.URI<WriterURI>]> = HKT.instance({
  map_,
  map
})

export function getApply<W>(S: P.Semigroup<W>): P.Apply<[HKT.URI<WriterURI>], HKT.Fix<'W', W>> {
  type V_ = HKT.Fix<'W', W>
  type URI = [HKT.URI<WriterURI>]
  const crossWith_: P.CrossWithFn_<URI, V_> = (fa, fb, f) => () => {
    const [a, w1] = fa()
    const [b, w2] = fb()
    return [f(a, b), S.combine_(w1, w2)]
  }

  return HKT.instance<P.Apply<[HKT.URI<WriterURI>], HKT.Fix<'W', W>>>({
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

export function getApplicative<W>(M: P.Monoid<W>) {
  return HKT.instance<P.Applicative<[HKT.URI<WriterURI>], HKT.Fix<'W', W>>>({
    ...getApply(M),
    pure: (a) => () => [a, M.nat],
    unit: () => () => [undefined, M.nat]
  })
}

export function getMonad<W>(M: P.Monoid<W>) {
  const bind_: P.BindFn_<[HKT.URI<WriterURI>], HKT.Fix<'W', W>> = (ma, f) => () => {
    const [a, w1] = ma()
    const [b, w2] = f(a)()
    return [b, M.combine_(w1, w2)]
  }
  return HKT.instance<P.Monad<[HKT.URI<WriterURI>], HKT.Fix<'W', W>>>({
    ...getApplicative(M),
    bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten: (mma) => bind_(mma, identity)
  })
}

/*
 * -------------------------------------------
 * Utils
 * -------------------------------------------
 */

export function evaluate<W, A>(fa: Writer<W, A>): A {
  return fa()[0]
}

export function execute<W, A>(fa: Writer<W, A>): W {
  return fa()[1]
}
