import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * IO Model
 * -------------------------------------------
 */

export const URI = "IO";

export type URI = typeof URI;

export type V = HKT.Auto;

export interface IO<A> {
   (): A;
}

export type InferA<T> = [T] extends [IO<infer A>] ? A : never;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: IO<A>;
   }
}
