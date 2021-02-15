import type { ExtractURI, InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as Eq from '@principia/base/Eq'

import { EqURI } from '@principia/base/Modules'

import { getApplyConfig } from '../../HKT'

export type URI = EqURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [EqURI]: (_: Env) => Eq.Eq<A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface ArrayConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [EqURI]: InterfaceConfigKind<URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [EqURI]: InterfaceConfigKind<URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [EqURI]: {
      required: InterfaceConfigKind<URI, Props>
      optional: InterfaceConfigKind<URI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [EqURI]: TaggedUnionConfigKind<URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [EqURI]: {
      readonly left: Eq.Eq<EA>
      readonly right: Eq.Eq<AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [EqURI]: IntersectionConfigKind<URI, S, R, E, A>
  }
}

export const applyEqConfig = getApplyConfig(EqURI)
