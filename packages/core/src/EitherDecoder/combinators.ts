import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "../Array/_core";
import type { DecodeErrors, ErrorInfo } from "../DecodeError";
import { error } from "../DecodeError";
import * as DE from "../DecodeError";
import type { Either } from "../Either";
import * as FS from "../FreeSemigroup";
import type { Refinement } from "../Function";
import { pipe } from "../Function";
import * as K from "../KleisliDecoder";
import type { Option } from "../Option";
import type { ReadonlyRecord } from "../Record";
import * as R from "../Record";
import type { EitherDecoder, InputOf, TypeOf } from "./model";
import { M } from "./monad";
import { UnknownArray, UnknownRecord } from "./primitives";

export function compose_<I, A, B>(
  from: EitherDecoder<I, A>,
  to: EitherDecoder<A, B>
): EitherDecoder<I, B> {
  return {
    decode: K.compose_(M)(from, to).decode,
    _meta: {
      name: `(${from._meta.name} >>> ${to._meta.name})`
    }
  };
}

export function compose<A, B>(
  to: EitherDecoder<A, B>
): <I>(from: EitherDecoder<I, A>) => EitherDecoder<I, B> {
  return (from) => compose_(from, to);
}

export function mapLeftWithInput<I>(
  f: (input: I, e: DecodeErrors) => DecodeErrors
): <A>(decoder: EitherDecoder<I, A>) => EitherDecoder<I, A> {
  return (decoder) => mapLeftWithInput_(decoder, f);
}

export function mapLeftWithInput_<I, A>(
  decoder: EitherDecoder<I, A>,
  f: (input: I, e: DecodeErrors) => DecodeErrors
): EitherDecoder<I, A> {
  return {
    decode: K.mapLeftWithInput_(M)(decoder, f).decode,
    _meta: {
      name: decoder._meta.name
    }
  };
}

export function wrapInfo<I>(
  info?: ErrorInfo
): <A>(decoder: EitherDecoder<I, A>) => EitherDecoder<I, A> {
  return (decoder) =>
    info ? mapLeftWithInput_(decoder, (_, e) => FS.element(DE.wrap(info, e))) : decoder;
}

export function withMessage<I>(
  message: (input: I, e: DecodeErrors) => string
): <A>(decoder: EitherDecoder<I, A>) => EitherDecoder<I, A> {
  return mapLeftWithInput((input, e) => FS.element(DE.wrap({ message: message(input, e) }, e)));
}

export function refine<A, B extends A>(
  refinement: Refinement<A, B>,
  name: string,
  info?: ErrorInfo
): <I>(from: EitherDecoder<I, A>) => EitherDecoder<I, B> {
  return (from) => ({
    decode: K.refine_(M)(from, refinement, (a) => error(a, name, info)).decode,
    _meta: {
      name: name
    }
  });
}

export function parse_<I, A, B>(
  from: EitherDecoder<I, A>,
  parser: (a: A) => Either<DecodeErrors, B>,
  name?: string
): EitherDecoder<I, B> {
  return {
    decode: K.parse_(M)(from, parser).decode,
    _meta: {
      name: name ?? from._meta.name
    }
  };
}

export function parse<A, B>(
  parser: (a: A) => Either<DecodeErrors, B>,
  name?: string
): <I>(from: EitherDecoder<I, A>) => EitherDecoder<I, B> {
  return (from) => parse_(from, parser, name);
}

export function nullable(
  info?: ErrorInfo
): <I, A>(or: EitherDecoder<I, A>) => EitherDecoder<I | null | undefined, A | null> {
  return (or) => ({
    decode: K.nullable_(M)(or, (u, e) =>
      FS.combine(
        FS.element(DE.member(0, error(u, "null | undefined", info))),
        FS.element(DE.member(1, e))
      )
    ).decode,
    _meta: {
      name: `${or._meta.name} | null | undefined`
    }
  });
}

export function optional(
  info?: ErrorInfo
): <I, A>(or: EitherDecoder<I, A>) => EitherDecoder<I | null | undefined, Option<A>> {
  return (or) => ({
    decode: K.optional_(M)(or, (u, e) =>
      FS.combine(
        FS.element(DE.member(0, error(u, "null | undefined", info))),
        FS.element(DE.member(1, e))
      )
    ).decode,
    _meta: {
      name: `${or._meta.name} | null | undefined`
    }
  });
}

export function fromType<P extends Record<string, EitherDecoder<any, any>>>(
  properties: P,
  info?: ErrorInfo
): EitherDecoder<
  {
    [K in keyof P]: InputOf<P[K]>;
  },
  {
    [K in keyof P]: TypeOf<P[K]>;
  }
> {
  const name: string = pipe(
    properties,
    R.reduceWithIndex([] as string[], (k, b, a) => [...b, `${k}: ${a._meta.name}`]),
    (as) => `{ ${as.join(", ")} }`
  );
  return pipe(
    {
      decode: K.fromType_(M)(properties, (k, e) => FS.element(DE.key(k, DE.required, e))).decode,
      _meta: {
        name
      }
    },
    wrapInfo({ name, ...info })
  );
}

export function type<P extends Record<string, EitherDecoder<any, any>>>(
  properties: P,
  info?: ErrorInfo
): EitherDecoder<
  unknown,
  {
    [K in keyof P]: TypeOf<P[K]>;
  }
> {
  return compose_(UnknownRecord(info) as any, fromType(properties, info));
}

export function fromPartial<P extends Record<string, EitherDecoder<any, any>>>(
  properties: P,
  info?: ErrorInfo
): EitherDecoder<
  Partial<
    {
      [K in keyof P]: InputOf<P[K]>;
    }
  >,
  Partial<
    {
      [K in keyof P]: TypeOf<P[K]>;
    }
  >
> {
  const name: string = pipe(
    properties,
    R.reduceWithIndex([] as string[], (k, b, a) => [...b, `${k}?: ${a._meta.name}`]),
    (as) => `{ ${as.join(", ")} }`
  );
  return pipe(
    {
      decode: K.fromPartial_(M)(properties, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
      _meta: {
        name
      }
    },
    wrapInfo({ name, ...info })
  );
}

export function partial<A>(
  properties: {
    [K in keyof A]: EitherDecoder<unknown, A[K]>;
  },
  info?: ErrorInfo
): EitherDecoder<
  unknown,
  Partial<
    {
      [K in keyof A]: A[K];
    }
  >
> {
  return compose_(UnknownRecord(info) as any, fromPartial(properties, info));
}

export function fromArray<I, A>(
  item: EitherDecoder<I, A>,
  info?: ErrorInfo
): EitherDecoder<ReadonlyArray<I>, ReadonlyArray<A>> {
  const name = `Array<${item._meta.name}>`;
  return pipe(
    {
      decode: K.fromArray_(M)(item, (i, e) => FS.element(DE.index(i, DE.optional, e))).decode,
      _meta: { name }
    },
    wrapInfo({ name, ...info })
  );
}

export function array<A>(
  item: EitherDecoder<unknown, A>,
  info?: ErrorInfo
): EitherDecoder<unknown, ReadonlyArray<A>> {
  return compose_(UnknownArray(info), fromArray(item, info));
}

export function fromRecord<I, A>(
  codomain: EitherDecoder<I, A>,
  info?: ErrorInfo
): EitherDecoder<ReadonlyRecord<string, I>, ReadonlyRecord<string, A>> {
  const name = `Record<string, ${codomain._meta.name}>`;
  return pipe(
    {
      decode: K.fromRecord_(M)(codomain, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
      _meta: { name }
    },
    wrapInfo({ name, ...info })
  );
}

export function record<A>(
  codomain: EitherDecoder<unknown, A>,
  info?: ErrorInfo
): EitherDecoder<unknown, Record<string, A>> {
  return compose_(UnknownRecord(info), fromRecord(codomain, info));
}

export function fromTuple<C extends ReadonlyArray<EitherDecoder<any, any>>>(
  ...components: C
): (
  info?: ErrorInfo
) => EitherDecoder<
  [
    ...{
      [K in keyof C]: InputOf<C[K]>;
    }
  ],
  [
    ...{
      [K in keyof C]: TypeOf<C[K]>;
    }
  ]
> {
  return (info) => {
    const name: string = pipe(
      components,
      A.map((d) => d._meta.name),
      (as) => `[${as.join(", ")}]`
    );
    return pipe(
      {
        decode: K.fromTuple(M)((i, e) => FS.element(DE.index(i, DE.required, e)))(...components)
          .decode,
        _meta: { name }
      },
      wrapInfo({ name, ...info })
    );
  };
}

export function tuple<A extends ReadonlyArray<unknown>>(
  ...components: {
    [K in keyof A]: EitherDecoder<unknown, A[K]>;
  }
): (info?: ErrorInfo | undefined) => EitherDecoder<unknown, A> {
  return (info) => compose_(UnknownArray(info) as any, fromTuple(...components)(info));
}

export function union(info?: ErrorInfo) {
  return <MS extends readonly [EitherDecoder<any, any>, ...Array<EitherDecoder<any, any>>]>(
    ...members: MS
  ): EitherDecoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => {
    const name = members.join(" | ");
    return pipe(
      {
        decode: K.union(M)((i, e) => FS.element(DE.member(i, e)))(...members).decode,
        _meta: { name }
      } as EitherDecoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>>,
      wrapInfo({ name, ...info })
    );
  };
}

export function intersect_<IA, A, IB, B>(
  left: EitherDecoder<IA, A>,
  right: EitherDecoder<IB, B>,
  name?: string
): EitherDecoder<IA & IB, A & B> {
  return pipe(
    {
      decode: K.intersect_(M)(left, right).decode,
      _meta: {
        name: name ?? `${left._meta.name} & ${right._meta.name}`
      }
    },
    wrapInfo({ name: name ?? `${left._meta.name} & ${right._meta.name}` })
  );
}

export function intersect<IB, B>(
  right: EitherDecoder<IB, B>,
  name?: string
): <IA, A>(left: EitherDecoder<IA, A>) => EitherDecoder<IA & IB, A & B> {
  return (left) => intersect_(left, right, name);
}

export function intersectAll<
  A extends readonly [
    EitherDecoder<any, any>,
    EitherDecoder<any, any>,
    ...(readonly EitherDecoder<any, any>[])
  ]
>(
  decoders: A,
  name?: string
): EitherDecoder<
  UnionToIntersection<
    {
      [K in keyof A]: InputOf<A[K]>;
    }[keyof A]
  >,
  UnionToIntersection<
    {
      [K in keyof A]: TypeOf<A[K]>;
    }[keyof A]
  >
> {
  const [left, right, ...rest] = decoders;
  const decode = A.reduce_(rest, K.intersect_(M)(left, right), (b, a) => K.intersect_(M)(b, a))
    .decode;
  const _name = name ?? A.map_(decoders, (d) => d._meta.name).join(" & ");

  return pipe({ decode, _meta: { name: name ?? _name } }, wrapInfo({ name: name ?? _name }));
}

export function fromSum_<T extends string, MS extends Record<string, EitherDecoder<any, any>>>(
  tag: T,
  members: MS
): EitherDecoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> {
  const name: string = pipe(
    members,
    R.reduce([] as string[], (b, a) => [...b, a._meta.name]),
    (as) => as.join(" | ")
  );

  const decode = K.fromSum_(M)(tag, members, (tag, value, keys) =>
    FS.element(
      DE.key(
        tag,
        DE.required,
        error(value, keys.length === 0 ? "never" : keys.map((k) => JSON.stringify(k)).join(" | "))
      )
    )
  ).decode;

  return pipe({ decode, _meta: { name } }, wrapInfo({ name }));
}

export function fromSum<T extends string>(tag: T) {
  return <MS extends Record<string, EitherDecoder<any, any>>>(
    members: MS
  ): EitherDecoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => fromSum_(tag, members);
}

export function sum_<T extends string, A>(
  tag: T,
  members: {
    [K in keyof A]: EitherDecoder<unknown, A[K]>;
  },
  info?: ErrorInfo
): EitherDecoder<unknown, A[keyof A]> {
  return compose_(UnknownRecord(info), fromSum(tag)(members));
}

export function sum<T extends string>(
  tag: T,
  info?: ErrorInfo
): <A>(
  members: { [K in keyof A]: EitherDecoder<unknown, A[K]> }
) => EitherDecoder<unknown, A[keyof A]> {
  return (members) => sum_(tag, members, info);
}

export function lazy<I, A>(
  id: string,
  f: () => EitherDecoder<I, A>,
  info?: ErrorInfo
): EitherDecoder<I, A> {
  return pipe(
    {
      decode: K.lazy_(M)(id, f, (id, e) => FS.element(DE.lazy(id, e))).decode,
      _meta: {
        name: info?.name ?? id
      }
    },
    wrapInfo({ name: id, ...info })
  );
}

export function map_<I, A, B>(fa: EitherDecoder<I, A>, f: (a: A) => B): EitherDecoder<I, B> {
  return {
    decode: K.map_(M)(fa, f).decode,
    _meta: {
      name: fa._meta.name
    }
  };
}

export function map<A, B>(f: (a: A) => B): <I>(fa: EitherDecoder<I, A>) => EitherDecoder<I, B> {
  return (fa) => map_(fa, f);
}

export function alt_<I, A>(
  me: EitherDecoder<I, A>,
  that: () => EitherDecoder<I, A>
): EitherDecoder<I, A> {
  return {
    decode: K.alt_(M)(me, that).decode,
    _meta: {
      name: `${me._meta.name} <!> ${that()._meta.name}`
    }
  };
}

export function alt<I, A>(
  that: () => EitherDecoder<I, A>
): (me: EitherDecoder<I, A>) => EitherDecoder<I, A> {
  return (me) => alt_(me, that);
}

export function id<A>(): EitherDecoder<A, A> {
  return {
    decode: K.id(M)<A>().decode,
    _meta: {
      name: ""
    }
  };
}
