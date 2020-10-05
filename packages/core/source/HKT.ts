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

export interface HKT<F, A> {
   readonly _URI: F;
   readonly _A: A;
}

export interface HKT2<F, E, A> {
   readonly _URI: F;
   readonly _E: E;
   readonly _A: A;
}

export interface HKT3<F, R, E, A> {
   readonly _URI: F;
   readonly _R: R;
   readonly _E: E;
   readonly _A: A;
}

export interface HKT4<F, S, R, E, A> {
   readonly _URI: F;
   readonly _S: S;
   readonly _R: R;
   readonly _E: E;
   readonly _A: A;
}

export const HKTFullURI = "HKTFullURI";
export type HKTFullURI = typeof HKTFullURI;
export interface HKTFull<K, Q, W, X, I, S, R, E, A> {
   readonly _URI: HKTFullURI;
   readonly _K: K;
   readonly _Q: Q;
   readonly _W: W;
   readonly _X: X;
   readonly _I: I;
   readonly _S: S;
   readonly _R: R;
   readonly _E: E;
   readonly _A: A;
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
   ["HKT"]: HKT<AccessCustom<FC, "F">, A>;
   ["HKT2"]: HKT2<AccessCustom<FC, "F">, E, A>;
   ["HKT3"]: HKT3<AccessCustom<FC, "F">, R, E, A>;
   ["HKT4"]: HKT4<AccessCustom<FC, "F">, S, R, E, A>;
}

/**
 * A type-level dictionary for indexed HKTs
 */
export interface URItoIndex<N extends string, K> {
   ["HKT"]: K;
   ["HKT2"]: K;
   ["HKT3"]: K;
   ["HKT4"]: K;
}

/*
 * -------------------------------------------
 * Kind Encoding
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/kind.ts
 * -------------------------------------------
 */

export type ConcreteURIS = keyof URItoKind<
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
   any,
   any
>;

export type URIS = [RealURIS, ...RealURIS[]];

export interface URI<F extends ConcreteURIS, C> {
   readonly _F: F;
   readonly _C: C;
}

export type RealURIS = ConcreteURIS | URI<ConcreteURIS, any>;

export type AppendURI<F extends RealURIS[], G extends RealURIS> = F extends RealURIS[]
   ? [...F, G]
   : F;

export type PrependURI<G extends RealURIS, F extends RealURIS[]> = F extends RealURIS[]
   ? [G, ...F]
   : F;

export type ConcreteKind<F extends URIS, C, N extends string, K, Q, W, X, I, S, R, E, A> = ((
   ...x: F
) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
   ? XURI extends ConcreteURIS
      ? URItoKind<
           Auto,
           C,
           N,
           K,
           Q,
           W,
           X,
           I,
           S,
           R,
           E,
           Rest extends URIS ? ConcreteKind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
        >[XURI]
      : XURI extends URI<infer U, infer FC>
      ? URItoKind<
           FC,
           C,
           OrFix<"N", FC, N>,
           OrFix<"K", FC, K>,
           OrFix<"Q", FC, Q>,
           OrFix<"W", FC, W>,
           OrFix<"X", FC, X>,
           OrFix<"I", FC, I>,
           OrFix<"S", FC, S>,
           OrFix<"R", FC, R>,
           OrFix<"E", FC, E>,
           Rest extends URIS ? ConcreteKind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
        >[U]
      : never
   : never;

/**
 * Encodes a type constructor
 */
export type Kind<F extends URIS, C, N extends string, K, Q, W, X, I, S, R, E, A> = ConcreteKind<
   F,
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
   A
>;

/*
 * -------------------------------------------
 * Inference
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/core/src/Prelude/HKT/infer.ts
 * -------------------------------------------
 */

export type Infer<F extends URIS, P extends Param | "A" | "C", K> = [K] extends [
   ConcreteKind<
      F,
      infer C,
      infer N,
      infer K,
      infer Q,
      infer W,
      infer X,
      infer I,
      infer S,
      infer R,
      infer E,
      infer A
   >
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

export type URIOf<
   K extends ConcreteKind<any, any, any, any, any, any, any, any, any, any, any, any>
> = K extends ConcreteKind<infer F, any, any, any, any, any, any, any, any, any, any, any>
   ? F
   : never;

export type IndexForBase<F extends ConcreteURIS, N extends string, K> = F extends keyof URItoIndex<
   any,
   any
>
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

export interface Fix<P extends Param, F> {
   Fix: {
      [p in P]: {
         F: () => F;
      };
   };
}

export type OrFix<P extends Param, A, B> = A extends Fix<P, infer X>
   ? P extends "N"
      ? X extends string
         ? X
         : B
      : X
   : B;

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
