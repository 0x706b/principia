import type { CombineFn_, Monoid, Ord, Ordering } from './typeclass'

import { EqBoolean, EqNumber, EqString } from './Eq'
import { EQ, GT, LT, MonoidOrdering } from './Ordering'
import { makeOrd } from './typeclass'

export { makeOrd, Ord }

export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return makeOrd((x, y) => fa.compare_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f)
}

const defaultCompare = (y: any): ((x: any) => Ordering) => {
  return (x) => (x < y ? LT : x > y ? GT : EQ)
}

const defaultCompare_ = (x: any, y: any) => (x < y ? LT : x > y ? GT : EQ)

export const OrdString: Ord<string> = {
  ...EqString,
  compare: defaultCompare,
  compare_: defaultCompare_
}

export const OrdNumber: Ord<number> = {
  ...EqNumber,
  compare: defaultCompare,
  compare_: defaultCompare_
}

export const OrdBoolean: Ord<boolean> = {
  ...EqBoolean,
  compare: defaultCompare,
  compare_: defaultCompare_
}

export const lt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) === LT

export const gt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) === GT

export const leq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) !== GT

export const geq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) !== LT

export const min = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare_(x, y) === GT ? y : x)

export const max = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare_(x, y) === LT ? y : x)

export const lt_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) === LT

export const gt_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) === GT

export const leq_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) !== GT

export const geq_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) !== LT

export const min_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === GT ? y : x)

export const max_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === LT ? y : x)

export const getMonoidOrd = <A = never>(): Monoid<Ord<A>> => {
  const combine_: CombineFn_<Ord<A>> = (x, y) =>
    makeOrd((a, b) => MonoidOrdering.combine_(x.compare(a)(b), y.compare(a)(b)))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y),
    nat: makeOrd(() => EQ)
  }
}
