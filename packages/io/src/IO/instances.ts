import type { IOURI } from '../Modules'
import type { V } from './core'
import type * as HKT from '@principia/base/HKT'

import * as P from '@principia/base/typeclass'
import { mapNF, sequenceSF } from '@principia/base/typeclass'

import { apPar_, crossPar_, crossWithPar_ } from './combinators'
import { ap_, bimap_, bind_, catchAll_, cross_, crossWith_, fail, flatten, map_, mapError_, pure, unit } from './core'

type URI = [HKT.URI<IOURI>]

export const Functor = P.Functor<URI, V>({
  map_
})

export const Bifunctor = P.Bifunctor<URI, V>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorPar = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const mapN    = mapNF(SemimonoidalFunctor)
export const mapNPar = mapNF(SemimonoidalFunctorPar)

export const sequenceS    = sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = sequenceSF(SemimonoidalFunctorPar)

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const ApplyPar = P.Apply<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorPar = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  unit
})

export const Applicative = P.Applicative<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativePar = P.Applicative<URI, V>({
  map_,
  cross_: crossPar_,
  crossWith_: crossWithPar_,
  ap_: apPar_,
  unit,
  pure
})

export const Monad = P.Monad<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  catchAll_,
  fail
})
