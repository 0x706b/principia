import type { Endomorphism } from './Function'
import type { StoreURI } from './Modules'

import { identity } from './Function'
import { flapF, flapF_ } from './Functor'
import * as HKT from './HKT'
import * as P from './typeclass'

export interface Store<S, A> {
  readonly peek: (s: S) => A
  readonly pos: S
}

/*
 * -------------------------------------------
 * Operations
 * -------------------------------------------
 */

export function seek_<S, A>(wa: Store<S, A>, s: S): Store<S, A> {
  return {
    peek: wa.peek,
    pos: s
  }
}

export function seek<S>(s: S): <A>(wa: Store<S, A>) => Store<S, A> {
  return (wa) => seek_(wa, s)
}

export function seeks_<S, A>(wa: Store<S, A>, f: Endomorphism<S>): Store<S, A> {
  return {
    peek: wa.peek,
    pos: f(wa.pos)
  }
}

export function seeks<S>(f: Endomorphism<S>): <A>(wa: Store<S, A>) => Store<S, A> {
  return (wa) => seeks_(wa, f)
}

export function peeks_<S, A>(wa: Store<S, A>, f: Endomorphism<S>): A {
  return wa.peek(f(wa.pos))
}

export function peeks<S>(f: Endomorphism<S>): <A>(wa: Store<S, A>) => A {
  return (wa) => peeks_(wa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<S, A, B>(fa: Store<S, A>, f: (a: A) => B): Store<S, B> {
  return {
    peek: (s) => f(fa.peek(s)),
    pos: fa.pos
  }
}

export function map<A, B>(f: (a: A) => B): <S>(fa: Store<S, A>) => Store<S, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Comonad
 * -------------------------------------------
 */

export function extend_<S, A, B>(wa: Store<S, A>, f: (wa: Store<S, A>) => B): Store<S, B> {
  return {
    peek: (s) => f({ peek: wa.peek, pos: s }),
    pos: wa.pos
  }
}

export function extend<S, A, B>(f: (wa: Store<S, A>) => B): (wa: Store<S, A>) => Store<S, B> {
  return (wa) => extend_(wa, f)
}

export function extract<S, A>(wa: Store<S, A>): A {
  return wa.peek(wa.pos)
}

export function duplicate<S, A>(wa: Store<S, A>): Store<S, Store<S, A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor: P.Functor<[HKT.URI<StoreURI>]> = P.getFunctor({
  map_
})

export const { as_, as, fcross_, fcross, flap_, flap } = Functor

export const Comonad = HKT.instance<P.Comonad<[HKT.URI<StoreURI>]>>({
  ...Functor,
  extract,
  extend_,
  extend
})
