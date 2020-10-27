import type { Erase, UnionToIntersection } from "./Utils";

/*
 * -------------------------------------------
 * Base
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/base.ts
 * -------------------------------------------
 */

export interface Auto {
   readonly Auto: unique symbol;
}

export interface Base<F, C = Auto> {
   readonly _F: F;
   readonly _C: C;
}

export interface BaseHKT<F, C = Auto> {
   readonly _HKT: unique symbol;
   readonly _URI: F;
   readonly _C: C;
}

export interface CompositionBase2<F, G, CF = Auto, CG = Auto> {
   readonly _F: F;
   readonly _G: G;
   readonly _CF: CF;
   readonly _CG: CG;
}

/*
 * -------------------------------------------
 * Generic Helpers
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/hkt.ts
 * -------------------------------------------
 */

export const HKT_URI = "HKT";
export type HKT_URI = typeof HKT_URI;
export interface HKT<URI, A> {
   readonly _URI: URI;
   readonly _A: A;
}

export const HKT2_URI = "HKT2";
export type HKT2_URI = typeof HKT2_URI;
export interface HKT2<URI, E, A> extends HKT<URI, A> {
   readonly _E: E;
}

export const HKT3_URI = "HKT3";
export type HKT3_URI = typeof HKT3_URI;
export interface HKT3<URI, R, E, A> extends HKT2<URI, E, A> {
   readonly _R: R;
}

export const HKT4_URI = "HKT4";
export type HKT4_URI = typeof HKT4_URI;
export interface HKT4<URI, S, R, E, A> extends HKT3<URI, R, E, A> {
   readonly _S: S;
}

export type UHKT<F> = [URI<"HKT", CustomType<"F", F>>];
export type UHKT2<F> = [URI<"HKT2", CustomType<"F", F>>];
export type UHKT3<F> = [URI<"HKT3", CustomType<"F", F>>];
export type UHKT4<F> = [URI<"HKT4", CustomType<"F", F>>];

/*
 * -------------------------------------------
 * HKT Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/hkt.ts
 * -------------------------------------------
 */

/**
 * A type-level dictionary for HKTs: URI -> Concrete Type
 */
export interface URItoKind<
   // encodes metadata carried at the URI level (like additional params)
   FC,
   // encodes constraints on parameters and variance at the typeclass level
   TC,
   // encodes nominal keys
   N extends string,
   // encodes generic keys
   K,
   // encodes free logic
   Q,
   // encodes free logic
   W,
   // encodes free logic
   X,
   // encodes free logic
   I,
   // encodes free logic
   S,
   // encodes free logic
   R,
   // encodes free logic
   E,
   // encodes output
   A
> {
   [HKT_URI]: HKT<AccessCustom<FC, "F">, A>;
   [HKT2_URI]: HKT2<AccessCustom<FC, "F">, E, A>;
   [HKT3_URI]: HKT3<AccessCustom<FC, "F">, R, E, A>;
   [HKT4_URI]: HKT4<AccessCustom<FC, "F">, S, R, E, A>;
}

export interface URItoKind1<TC, A> {
   [HKT_URI]: HKT<"HKT1", A>;
}

export interface URItoKind2<TC, E, A> {
   [HKT2_URI]: HKT2<"HKT2", E, A>;
}

export interface URItoKind3<TC, R, E, A> {
   [HKT3_URI]: HKT3<"HKT3", R, E, A>;
}

export interface URItoKind4<TC, S, R, E, A> {
   [HKT4_URI]: HKT4<"HKT4", S, R, E, A>;
}

/**
 * A type-level dictionary for indexed HKTs
 */
export interface URItoIndex<N extends string, K> {
   [HKT_URI]: K;
   [HKT2_URI]: K;
   [HKT3_URI]: K;
   [HKT4_URI]: K;
}

/*
 * -------------------------------------------
 * Kind Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/kind.ts
 * -------------------------------------------
 */

export type ConcreteURIS = keyof URItoKind<any, any, any, any, any, any, any, any, any, any, any, any>;

export type URIS = [RealURIS, ...RealURIS[]];

export interface URI<F extends ConcreteURIS, C> {
   readonly _F: F;
   readonly _C: C;
}

export type RealURIS = ConcreteURIS | URI<ConcreteURIS, any>;

export type AppendURI<F extends RealURIS[], G extends RealURIS> = F extends RealURIS[] ? [...F, G] : F;

export type PrependURI<G extends RealURIS, F extends RealURIS[]> = F extends RealURIS[] ? [G, ...F] : F;

export type Kind<F extends URIS, C, N extends string, K, Q, W, X, I, S, R, E, A> = ((...x: F) => any) extends (
   fst: infer XURI,
   ...rest: infer Rest
) => any
   ? XURI extends ConcreteURIS
      ? URItoKind<
           Auto,
           C,
           OrFix<"N", C, N>,
           OrFix<"K", C, K>,
           OrFix<"Q", C, Q>,
           OrFix<"W", C, W>,
           OrFix<"X", C, X>,
           OrFix<"I", C, I>,
           OrFix<"S", C, S>,
           OrFix<"R", C, R>,
           OrFix<"E", C, E>,
           Rest extends URIS ? Kind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
        >[XURI]
      : XURI extends URI<infer U, infer FC>
      ? URItoKind<
           FC,
           C,
           OrFix<"N", FC, OrFix<"N", C, N>>,
           OrFix<"K", FC, OrFix<"K", C, K>>,
           OrFix<"Q", FC, OrFix<"Q", C, Q>>,
           OrFix<"W", FC, OrFix<"W", C, W>>,
           OrFix<"X", FC, OrFix<"X", C, X>>,
           OrFix<"I", FC, OrFix<"I", C, I>>,
           OrFix<"S", FC, OrFix<"S", C, S>>,
           OrFix<"R", FC, OrFix<"R", C, R>>,
           OrFix<"E", FC, OrFix<"E", C, E>>,
           Rest extends URIS ? Kind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
        >[U]
      : never
   : never;

export type URIS1 = keyof URItoKind1<any, any>;
export type URIS2 = keyof URItoKind2<any, any, any>;
export type URIS3 = keyof URItoKind3<any, any, any, any>;
export type URIS4 = keyof URItoKind4<any, any, any, any, any>;

export type Kind1<F extends URIS1, C, A> = F extends URIS1 ? URItoKind1<C, A>[F] : never;
export type Kind2<F extends URIS2, C, E, A> = F extends URIS2 ? URItoKind2<C, OrFix2<"E", C, E>, A>[F] : never;
export type Kind3<F extends URIS3, C, R, E, A> = F extends URIS3
   ? URItoKind3<C, OrFix3<"R", C, R>, OrFix3<"E", C, E>, A>[F]
   : never;
export type Kind4<F extends URIS4, C, S, R, E, A> = F extends URIS4
   ? URItoKind4<C, OrFix4<"S", C, S>, OrFix4<"R", C, R>, OrFix4<"E", C, E>, A>[F]
   : never;

/*
 * -------------------------------------------
 * Inference
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/infer.ts
 * -------------------------------------------
 */

export type Infer<F extends URIS, C, P extends Param | "A" | "C", K> = [K] extends [
   Kind<F, C, infer N, infer K, infer Q, infer W, infer X, infer I, infer S, infer R, infer E, infer A>
]
   ? P extends "C"
      ? C
      : P extends "N"
      ? N
      : P extends "K"
      ? K
      : P extends "Q"
      ? Q
      : P extends "W"
      ? W
      : P extends "X"
      ? X
      : P extends "I"
      ? I
      : P extends "S"
      ? S
      : P extends "R"
      ? R
      : P extends "E"
      ? E
      : P extends "A"
      ? A
      : never
   : never;

export type URIOf<K extends Kind<any, any, any, any, any, any, any, any, any, any, any, any>> = K extends Kind<
   infer F,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any
>
   ? F
   : never;

export type IndexForBase<F extends ConcreteURIS, N extends string, K> = F extends keyof URItoIndex<any, any>
   ? URItoIndex<N, K>[F]
   : K;

export type IndexFor<F extends URIS, N extends string, K> = IndexForBase<
   {
      [K in keyof F]: F[K] extends ConcreteURIS ? F[K] : F[K] extends URI<infer U, any> ? U : never;
   }[number],
   N,
   K
>;

/*
 * -------------------------------------------
 * Custom
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/custom.ts
 * -------------------------------------------
 */

export interface CustomType<P extends string, V> {
   CustomType: {
      [p in P]: () => V;
   };
}

export type AccessCustom<C, P extends string, D = any> = C extends CustomType<P, infer V> ? V : D;

export type AccessCustomExtends<C, P extends string, D = any> = C extends CustomType<P, infer V>
   ? V extends D
      ? V
      : D
   : D;

/*
 * -------------------------------------------
 * Fix
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/fix.ts
 * -------------------------------------------
 */

export type Param = "N" | "K" | "Q" | "W" | "I" | "X" | "S" | "R" | "E";

export type Param2 = "E";
export type Param3 = "R" | "E";
export type Param4 = "S" | "R" | "E";

export interface Fix<P extends Param, F> {
   Fix: {
      [p in P]: {
         F: () => F;
      };
   };
}

export type Fix2<P extends Param2, F> = Fix<P, F>;
export type Fix3<P extends Param3, F> = Fix<P, F>;
export type Fix4<P extends Param4, F> = Fix<P, F>;

export type OrFix<P extends Param, A, B> = A extends Fix<P, infer X>
   ? P extends "N"
      ? X extends string
         ? X
         : B
      : X
   : B;

export type OrFix2<P extends Param2, C, A> = C extends Fix2<P, infer X> ? X : A;
export type OrFix3<P extends Param3, C, A> = C extends Fix3<P, infer X> ? X : A;
export type OrFix4<P extends Param4, C, A> = C extends Fix4<P, infer X> ? X : A;

export type Unfix<C, P extends Param> = (Exclude<keyof C, "Fix"> extends never
   ? unknown
   : {
        [K in Exclude<keyof C, "Fix">]: C[K];
     }) &
   (keyof C & "Fix" extends never
      ? unknown
      : {
           [K in keyof C & "Fix"]: {
              [KK in Exclude<keyof C[K], P>]: C[K][KK];
           };
        });

export type CleanParam<C, P extends Param> = Unfix<Erase<Strip<C, P>, Auto>, P>;

/*
 * -------------------------------------------
 * OrNever
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/or-never.ts
 * -------------------------------------------
 */

export type OrNever<K> = unknown extends K ? never : K;

/*
 * -------------------------------------------
 * Variance Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/variance.ts
 * -------------------------------------------
 */

export type Variance = "+" | "-" | "_";

export interface V<F extends Param, V extends Variance> {
   Variance: {
      [v in V]: () => F;
   };
}

export type V2<P extends Param2, X extends Variance> = V<P, X>;
export type V3<P extends Param3, X extends Variance> = V<P, X>;
export type V4<P extends Param4, X extends Variance> = V<P, X>;

/**
 * Composes types according to variance specified in C
 */
export type Mix<C, P extends Param, X extends [any, ...any[]]> = C extends V<P, "_">
   ? X[0]
   : C extends V<P, "+">
   ? X[number]
   : C extends V<P, "-">
   ? X extends [any]
      ? X[0]
      : X extends [any, any]
      ? X[0] & X[1]
      : X extends [any, any, any]
      ? X[0] & X[1] & X[2]
      : X extends [any, any, any, any]
      ? X[0] & X[1] & X[2] & X[3]
      : X extends [any, any, any, any, any]
      ? X[0] & X[1] & X[2] & X[3] & X[4]
      : X extends [any, any, any, any, any, any]
      ? X[0] & X[1] & X[2] & X[3] & X[4] & X[5]
      : UnionToIntersection<{ [k in keyof X]: OrNever<X[k]> }[keyof X]>
   : X[0];

export type Mix2<C, P extends Param2, X extends [any, ...any[]]> = Mix<C, P, X>;
export type Mix3<C, P extends Param3, X extends [any, ...any[]]> = Mix<C, P, X>;
export type Mix4<C, P extends Param4, X extends [any, ...any[]]> = Mix<C, P, X>;

/**
 * Composes a record of types to the base respecting variance from C
 */
export type MixStruct<C, P extends Param, X, Y> = C extends V<P, "_">
   ? X
   : C extends V<P, "+">
   ? Y[keyof Y]
   : C extends V<P, "-">
   ? P extends "N"
      ? string
      : UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[keyof Y]>
   : X;

/**
 * Used in subsequent definitions to either vary a paramter or keep it fixed to "Fixed"
 */
export type Intro<C, P extends Param, Fixed, Current> = C extends V<P, "_">
   ? Fixed
   : C extends V<P, "+">
   ? Current
   : C extends V<P, "-">
   ? Current
   : Fixed;

export type Intro2<C, P extends Param2, Fixed, Current> = C extends V2<P, "_">
   ? Fixed
   : C extends V2<P, "+">
   ? Current
   : C extends V2<P, "-">
   ? Current
   : Fixed;

export type Intro3<C, P extends Param3, Fixed, Current> = C extends V3<P, "_">
   ? Fixed
   : C extends V3<P, "+">
   ? Current
   : C extends V3<P, "-">
   ? Current
   : Fixed;

export type Intro4<C, P extends Param4, Fixed, Current> = C extends V4<P, "_">
   ? Fixed
   : C extends V4<P, "+">
   ? Current
   : C extends V4<P, "-">
   ? Current
   : Fixed;

/**
 * Initial type depending on variance of P in C (eg: initial Contravariant R = unknown, initial Covariant E = never)
 */
export type Initial<C, P extends Param> = C extends V<P, "-">
   ? P extends "N"
      ? string
      : unknown
   : C extends V<P, "+">
   ? never
   : any;

export type Initial2<C, P extends Param2> = C extends V2<P, "-"> ? unknown : C extends V2<P, "+"> ? never : any;
export type Initial3<C, P extends Param3> = C extends V3<P, "-"> ? unknown : C extends V3<P, "+"> ? never : any;
export type Initial4<C, P extends Param4> = C extends V4<P, "-"> ? unknown : C extends V4<P, "+"> ? never : any;

export type Strip<C, P extends Param> = Erase<C, V<P, "_"> & V<P, "-"> & V<P, "+">>;

/*
 * -------------------------------------------
 * Instance Helpers
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/instance.ts
 * -------------------------------------------
 */

export type Ignores = "_F" | "_G" | "Commutative" | "_C" | "_CF" | "_CG";

/**
 * A helper for constructing typeclass instances
 */
export const instance = <T>(_: Omit<T, Ignores>): T => _ as any;
