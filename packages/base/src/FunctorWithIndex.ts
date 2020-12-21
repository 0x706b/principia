import type * as HKT from "./HKT";

export interface FunctorWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly mapWithIndex: MapWithIndexFn<F, C>;
  readonly mapWithIndex_: MapWithIndexFn_<F, C>;
}

export interface MapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => B
  ): <W, Q, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, W, Q, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, W, Q, X, I, S, R, E, B>;
}

export interface MapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, W, Q, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, W, Q, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => B
  ): HKT.Kind<F, C, N, K, W, Q, X, I, S, R, E, B>;
}
