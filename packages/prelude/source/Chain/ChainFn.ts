import type * as HKT from "../HKT";
import type { Monad, Monad1, Monad2, Monad3, Monad4, MonadHKT } from "../Monad";

export interface ChainFn<F extends HKT.URIS, TC = HKT.Auto> {
   <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, A>(
      f: (a: A) => HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>
   ): <N extends string, K, Q, W, X, I, S, R, E>(
      ma: HKT.Kind<
         F,
         TC,
         HKT.Intro<TC, "N", N1, N>,
         HKT.Intro<TC, "K", K1, K>,
         HKT.Intro<TC, "Q", Q1, Q>,
         HKT.Intro<TC, "W", W1, W>,
         HKT.Intro<TC, "X", X1, X>,
         HKT.Intro<TC, "I", I1, I>,
         HKT.Intro<TC, "S", S1, S>,
         HKT.Intro<TC, "R", R1, R>,
         HKT.Intro<TC, "E", E1, E>,
         A
      >
   ) => HKT.Kind<
      F,
      TC,
      HKT.Mix<TC, "N", [N1, N]>,
      HKT.Mix<TC, "K", [K1, K]>,
      HKT.Mix<TC, "Q", [Q1, Q]>,
      HKT.Mix<TC, "W", [W1, W]>,
      HKT.Mix<TC, "X", [X1, X]>,
      HKT.Mix<TC, "I", [I1, I]>,
      HKT.Mix<TC, "S", [S1, S]>,
      HKT.Mix<TC, "R", [R1, R]>,
      HKT.Mix<TC, "E", [E1, E]>,
      B
   >;
}

export interface ChainFn_<F extends HKT.URIS, TC = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
      ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
      f: (
         a: A
      ) => HKT.Kind<
         F,
         TC,
         HKT.Intro<TC, "N", N, N1>,
         HKT.Intro<TC, "K", K, K1>,
         HKT.Intro<TC, "Q", Q, Q1>,
         HKT.Intro<TC, "W", W, W1>,
         HKT.Intro<TC, "X", X, X1>,
         HKT.Intro<TC, "I", I, I1>,
         HKT.Intro<TC, "S", S, S1>,
         HKT.Intro<TC, "R", R, R1>,
         HKT.Intro<TC, "E", E, E1>,
         B
      >
   ): HKT.Kind<
      F,
      TC,
      HKT.Mix<TC, "N", [N1, N]>,
      HKT.Mix<TC, "K", [K1, K]>,
      HKT.Mix<TC, "Q", [Q1, Q]>,
      HKT.Mix<TC, "W", [W1, W]>,
      HKT.Mix<TC, "X", [X1, X]>,
      HKT.Mix<TC, "I", [I1, I]>,
      HKT.Mix<TC, "S", [S1, S]>,
      HKT.Mix<TC, "R", [R1, R]>,
      HKT.Mix<TC, "E", [E1, E]>,
      B
   >;
}

export interface ChainFnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
   <
      NF1 extends string,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      NG1 extends string,
      KG1,
      QG1,
      WG1,
      XG1,
      IG1,
      SG1,
      RG1,
      EG1,
      A,
      B
   >(
      f: (
         a: A
      ) => HKT.Kind<
         F,
         TCF,
         NF1,
         KF1,
         QF1,
         WF1,
         XF1,
         IF1,
         SF1,
         RF1,
         EF1,
         HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>
      >
   ): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
      fga: HKT.Kind<
         F,
         TCF,
         HKT.Intro<TCF, "N", NF1, NF>,
         HKT.Intro<TCF, "K", KF1, KF>,
         HKT.Intro<TCF, "Q", QF1, QF>,
         HKT.Intro<TCF, "W", WF1, WF>,
         HKT.Intro<TCF, "X", XF1, XF>,
         HKT.Intro<TCF, "I", IF1, IF>,
         HKT.Intro<TCF, "S", SF1, SF>,
         HKT.Intro<TCF, "R", RF1, RF>,
         HKT.Intro<TCF, "E", EF1, EF>,
         HKT.Kind<
            G,
            TCG,
            HKT.Intro<TCG, "N", NG1, NG>,
            HKT.Intro<TCG, "K", KG1, KG>,
            HKT.Intro<TCG, "Q", QG1, QG>,
            HKT.Intro<TCG, "W", WG1, WG>,
            HKT.Intro<TCG, "X", XG1, XG>,
            HKT.Intro<TCG, "I", IG1, IG>,
            HKT.Intro<TCG, "S", SG1, SG>,
            HKT.Intro<TCG, "R", RG1, RG>,
            HKT.Intro<TCG, "E", EG1, EG>,
            A
         >
      >
   ) => HKT.Kind<
      F,
      TCF,
      HKT.Mix<TCF, "N", [NF1, NF]>,
      HKT.Mix<TCF, "K", [KF1, KF]>,
      HKT.Mix<TCF, "Q", [QF1, QF]>,
      HKT.Mix<TCF, "W", [WF1, WF]>,
      HKT.Mix<TCF, "X", [XF1, XF]>,
      HKT.Mix<TCF, "I", [IF1, IF]>,
      HKT.Mix<TCF, "S", [SF1, SF]>,
      HKT.Mix<TCF, "R", [RF1, RF]>,
      HKT.Mix<TCF, "E", [EF1, EF]>,
      HKT.Kind<
         G,
         TCG,
         HKT.Mix<TCG, "N", [NG1, NG]>,
         HKT.Mix<TCG, "K", [KG1, KG]>,
         HKT.Mix<TCG, "Q", [QG1, QG]>,
         HKT.Mix<TCG, "W", [WG1, WG]>,
         HKT.Mix<TCG, "X", [XG1, XG]>,
         HKT.Mix<TCG, "I", [IG1, IG]>,
         HKT.Mix<TCG, "S", [SG1, SG]>,
         HKT.Mix<TCG, "R", [RG1, RG]>,
         HKT.Mix<TCG, "E", [EG1, EG]>,
         B
      >
   >;
}

export interface ChainFnComposition_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
   <
      NF extends string,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      NG extends string,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG,
      NF1 extends string,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      NG1 extends string,
      KG1,
      QG1,
      WG1,
      XG1,
      IG1,
      SG1,
      RG1,
      EG1,
      A,
      B
   >(
      fga: HKT.Kind<
         F,
         TCF,
         NF,
         KF,
         QF,
         WF,
         XF,
         IF,
         SF,
         RF,
         EF,
         HKT.Kind<G, TCG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>
      >,
      f: (
         a: A
      ) => HKT.Kind<
         F,
         TCF,
         HKT.Intro<TCF, "N", NF, NF1>,
         HKT.Intro<TCF, "K", KF, KF1>,
         HKT.Intro<TCF, "Q", QF, QF1>,
         HKT.Intro<TCF, "W", WF, WF1>,
         HKT.Intro<TCF, "X", XF, XF1>,
         HKT.Intro<TCF, "I", IF, IF1>,
         HKT.Intro<TCF, "S", SF, SF1>,
         HKT.Intro<TCF, "R", RF, RF1>,
         HKT.Intro<TCF, "E", EF, EF1>,
         HKT.Kind<
            G,
            TCG,
            HKT.Intro<TCG, "N", NG, NG1>,
            HKT.Intro<TCG, "K", KG, KG1>,
            HKT.Intro<TCG, "Q", QG, QG1>,
            HKT.Intro<TCG, "W", WG, WG1>,
            HKT.Intro<TCG, "X", XG, XG1>,
            HKT.Intro<TCG, "I", IG, IG1>,
            HKT.Intro<TCG, "S", SG, SG1>,
            HKT.Intro<TCG, "R", RG, RG1>,
            HKT.Intro<TCG, "E", EG, EG1>,
            B
         >
      >
   ): HKT.Kind<
      F,
      TCF,
      HKT.Mix<TCF, "N", [NF1, NF]>,
      HKT.Mix<TCF, "K", [KF1, KF]>,
      HKT.Mix<TCF, "Q", [QF1, QF]>,
      HKT.Mix<TCF, "W", [WF1, WF]>,
      HKT.Mix<TCF, "X", [XF1, XF]>,
      HKT.Mix<TCF, "I", [IF1, IF]>,
      HKT.Mix<TCF, "S", [SF1, SF]>,
      HKT.Mix<TCF, "R", [RF1, RF]>,
      HKT.Mix<TCF, "E", [EF1, EF]>,
      HKT.Kind<
         G,
         TCG,
         HKT.Mix<TCG, "N", [NG1, NG]>,
         HKT.Mix<TCG, "K", [KG1, KG]>,
         HKT.Mix<TCG, "Q", [QG1, QG]>,
         HKT.Mix<TCG, "W", [WG1, WG]>,
         HKT.Mix<TCG, "X", [XG1, XG]>,
         HKT.Mix<TCG, "I", [IG1, IG]>,
         HKT.Mix<TCG, "S", [SG1, SG]>,
         HKT.Mix<TCG, "R", [RG1, RG]>,
         HKT.Mix<TCG, "E", [EG1, EG]>,
         B
      >
   >;
}

export function chainF<F extends HKT.URIS, TC = HKT.Auto>(F: Monad<F, TC>): ChainFn<F, TC>;
export function chainF<F extends HKT.URIS1, TC = HKT.Auto>(
   F: Monad1<F, TC>
): <A, B>(f: (a: A) => HKT.Kind1<F, TC, B>) => (fa: HKT.Kind1<F, TC, A>) => HKT.Kind1<F, TC, B>;
export function chainF<F extends HKT.URIS2, TC = HKT.Auto>(
   F: Monad2<F, TC>
): <A, G, B>(
   f: (a: A) => HKT.Kind2<F, TC, G, B>
) => <E>(fa: HKT.Kind2<F, TC, HKT.Intro2<TC, "E", G, E>, B>) => HKT.Kind2<F, TC, HKT.Mix2<TC, "E", [G, E]>, B>;
export function chainF<F>(F: MonadHKT<F>): <A, B>(f: (a: A) => HKT.HKT<F, B>) => (ma: HKT.HKT<F, A>) => HKT.HKT<F, B>;
export function chainF<F>(F: Monad<HKT.UHKT<F>>): ChainFn<HKT.UHKT<F>> {
   return (f) => (ma) => F.flatten(F.map_(ma, f));
}

export function chainF_<F extends HKT.URIS, TC = HKT.Auto>(F: Monad<F, TC>): ChainFn_<F, TC>;
export function chainF_<F extends HKT.URIS1, TC = HKT.Auto>(
   F: Monad1<F, TC>
): <A, B>(ma: HKT.Kind1<F, TC, A>, f: (a: A) => HKT.Kind1<F, TC, B>) => HKT.Kind1<F, TC, B>;
export function chainF_<F extends HKT.URIS2, TC = HKT.Auto>(
   F: Monad2<F, TC>
): <E, A, G, B>(
   ma: HKT.Kind2<F, TC, E, A>,
   f: (a: A) => HKT.Kind2<F, TC, HKT.Intro2<TC, "E", E, G>, B>
) => HKT.Kind2<F, TC, HKT.Mix2<TC, "E", [E, G]>, B>;
export function chainF_<F extends HKT.URIS3, TC = HKT.Auto>(
   F: Monad3<F, TC>
): <R, E, A, Q, G, B>(
   ma: HKT.Kind3<F, TC, R, E, A>,
   f: (a: A) => HKT.Kind3<F, TC, HKT.Intro3<TC, "R", R, Q>, HKT.Intro3<TC, "E", E, G>, B>
) => HKT.Kind3<F, TC, HKT.Mix3<TC, "R", [R, Q]>, HKT.Mix3<TC, "E", [E, G]>, B>;
export function chainF_<F extends HKT.URIS4, TC = HKT.Auto>(
   F: Monad4<F, TC>
): <S, R, E, A, U, Q, G, B>(
   ma: HKT.Kind4<F, TC, S, R, E, A>,
   f: (a: A) => HKT.Kind4<F, TC, HKT.Intro4<TC, "S", S, U>, HKT.Intro3<TC, "R", R, Q>, HKT.Intro3<TC, "E", E, G>, B>
) => HKT.Kind4<F, TC, HKT.Mix4<TC, "S", [S, U]>, HKT.Mix4<TC, "R", [R, Q]>, HKT.Mix4<TC, "E", [E, G]>, B>;
export function chainF_<F>(F: MonadHKT<F>): <A, B>(ma: HKT.HKT<F, A>, f: (a: A) => HKT.HKT<F, B>) => HKT.HKT<F, B>;
export function chainF_<F>(F: Monad<HKT.UHKT<F>>): ChainFn_<HKT.UHKT<F>> {
   return (ma, f) => F.flatten(F.map_(ma, f));
}
