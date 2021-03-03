import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as S from '@principia/base/Show'

import { getApplyConfig } from '../../HKT'

export const ShowURI = 'model/Show'
export type ShowURI = typeof ShowURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [ShowURI]: (_: Env) => S.Show<A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
  interface ArrayConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
  interface TupleConfig<Types> {
    readonly [ShowURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, any, infer A>] ? S.Show<A> : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [ShowURI]: InterfaceConfigKind<ShowURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [ShowURI]: InterfaceConfigKind<ShowURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [ShowURI]: {
      required: InterfaceConfigKind<ShowURI, Props>
      optional: InterfaceConfigKind<ShowURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [ShowURI]: S.Show<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [ShowURI]: TaggedUnionConfigKind<ShowURI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [ShowURI]: {
      readonly left: S.Show<EA>
      readonly right: S.Show<AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [ShowURI]: IntersectionConfigKind<ShowURI, S, R, E, A>
  }
}

export const applyShowConfig = getApplyConfig(ShowURI)
