import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as E from '@principia/codec/Encoder'

import { getApplyConfig } from '../../HKT'

export const EncoderURI = 'model/Encoder'
export type EncoderURI = typeof EncoderURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [EncoderURI]: (_: Env) => E.Encoder<E, A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
  interface ArrayConfig<E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
  interface TupleConfig<Types> {
    readonly [EncoderURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, infer E, infer A>]
        ? E.Encoder<E, A>
        : never
    }
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [EncoderURI]: InterfaceConfigKind<EncoderURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [EncoderURI]: InterfaceConfigKind<EncoderURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [EncoderURI]: {
      required: InterfaceConfigKind<EncoderURI, Props>
      optional: InterfaceConfigKind<EncoderURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
  interface PrismConfig<E, A, N> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [EncoderURI]: TaggedUnionConfigKind<EncoderURI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [EncoderURI]: {
      readonly left: E.Encoder<EE, EA>
      readonly right: E.Encoder<AE, AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [EncoderURI]: E.Encoder<E, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [EncoderURI]: IntersectionConfigKind<EncoderURI, S, R, E, A>
  }
}

export const applyEncoderConfig = getApplyConfig(EncoderURI)
