import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as Eq from '@principia/base/Eq'

import { getApplyConfig } from '../../HKT'

export const EqURI = 'model/Eq'
export type EqURI = typeof EqURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, E, A> {
    readonly [EqURI]: (_: Env) => Eq.Eq<A>
  }
  interface URItoConfig<E, A> {
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
  interface TupleConfig<Types> {
    readonly [EqURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, infer A>] ? Eq.Eq<A> : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [EqURI]: InterfaceConfigKind<EqURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [EqURI]: InterfaceConfigKind<EqURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [EqURI]: {
      required: InterfaceConfigKind<EqURI, Props>
      optional: InterfaceConfigKind<EqURI, PropsPartial>
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
    readonly [EqURI]: TaggedUnionConfigKind<EqURI, Types>
  }
  interface EitherConfig<EE, EA, AE, AA> {
    readonly [EqURI]: {
      readonly left: Eq.Eq<EA>
      readonly right: Eq.Eq<AA>
    }
  }
  interface OptionConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface OptionalConfig<E, A> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<E, A> {
    readonly [EqURI]: IntersectionConfigKind<EqURI, E, A>
  }
}

export const applyEqConfig = getApplyConfig(EqURI)
