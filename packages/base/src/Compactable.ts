import type { Either } from "./data/Either";
import type { Option } from "./data/Option";
import type * as HKT from "./HKT";
import type { Separated } from "./util/types";

export interface Compactable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly compact: CompactFn<F, C>;
  readonly separate: SeparateFn<F, C>;
}

export interface CompactFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Option<A>>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>;
}
export interface SeparateFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<A, B>>
  ): Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  >;
}
