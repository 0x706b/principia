import type * as P from "@principia/prelude";
import type * as Eq from "@principia/prelude/Eq";
import type { FunctionN } from "@principia/prelude/Function";
import type * as HKT from "@principia/prelude/HKT";

function AssociativeCompositionLaw<
  F extends HKT.URIS,
  TC,
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A,
  NB extends string,
  KB,
  QB,
  WB,
  XB,
  IB,
  SB,
  RB,
  EB,
  B,
  NC extends string,
  KC,
  QC,
  WC,
  XC,
  IC,
  SC,
  RC,
  EC,
  C
>(
  F: P.Chain<F, TC>,
  S: Eq.Eq<
    HKT.Kind<
      F,
      TC,
      HKT.Mix<TC, "N", [N, NB, NC]>,
      HKT.Mix<TC, "K", [K, KB, KC]>,
      HKT.Mix<TC, "Q", [Q, QB, QC]>,
      HKT.Mix<TC, "W", [W, WB, WC]>,
      HKT.Mix<TC, "X", [X, XB, XC]>,
      HKT.Mix<TC, "I", [I, IB, IC]>,
      HKT.Mix<TC, "S", [S, SB, SC]>,
      HKT.Mix<TC, "R", [R, RB, RC]>,
      HKT.Mix<TC, "E", [E, EB, EC]>,
      C
    >
  >,
  afb: (a: A) => HKT.Kind<F, TC, NB, KB, QB, WB, XB, IB, SB, RB, EB, B>,
  bfc: (b: B) => HKT.Kind<F, TC, NC, KC, QC, WC, XC, IC, SC, RC, EC, C>
): (fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>) => boolean;
function AssociativeCompositionLaw<F, A, B, C>(
  F: P.Chain<HKT.UHKT<F>>,
  S: Eq.Eq<HKT.HKT<F, C>>,
  afb: FunctionN<[A], HKT.HKT<F, B>>,
  bfc: FunctionN<[B], HKT.HKT<F, C>>
): (fa: HKT.HKT<F, A>) => boolean {
  return (fa) => {
    return S.equals_(
      F.chain_(F.chain_(fa, afb), bfc),
      F.chain_(fa, (a) => F.chain_(afb(a), bfc))
    );
  };
}

export const Chain = {
  associativity: AssociativeCompositionLaw
  /*
   * derivedAp: <F, A, B>(
   *   F: Chain<HKT.UHKT<F>> & Apply<HKT.UHKT<F>>,
   *   S: Eq<HKT.HKT<F, B>>,
   *   fab: HKT.HKT<F, FunctionN<[A], B>>
   * ) => (fa: HKT.HKT<F, A>): boolean => {
   *   return S.equals_(
   *     F.ap_(fab, fa),
   *     F.chain_(fab, (f) => F.map_(fa, f))
   *   );
   * }
   */
};
