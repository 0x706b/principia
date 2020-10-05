import type * as HKT from "../../HKT";

export interface BothF<F extends HKT.URIS, C = HKT.Auto> {
   <S2, N2 extends string, K1, Q1, W1, X1, S3, R1, E1, B>(
      fb: HKT.Kind<F, C, N2, K1, Q1, W1, X1, S2, S3, R1, E1, B>
   ): <N extends string, K, Q, W, X, S1, R, E, A>(
      fa: HKT.Kind<
         F,
         C,
         HKT.Intro<C, "N", N2, N>,
         HKT.Intro<C, "K", K1, K>,
         HKT.Intro<C, "Q", Q1, Q>,
         HKT.Intro<C, "W", W1, W>,
         HKT.Intro<C, "X", X1, X>,
         S1,
         S2,
         HKT.Intro<C, "R", R1, R>,
         HKT.Intro<C, "E", E1, E>,
         A
      >
   ) => HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N2, N]>,
      HKT.Mix<C, "K", [K1, K]>,
      HKT.Mix<C, "Q", [Q1, Q]>,
      HKT.Mix<C, "W", [W1, W]>,
      HKT.Mix<C, "X", [X1, X]>,
      S1,
      S3,
      HKT.Mix<C, "R", [R1, R]>,
      HKT.Mix<C, "E", [E1, E]>,
      readonly [A, B]
   >;
}

export interface UC_BothF<F extends HKT.URIS, C = HKT.Auto> {
   <
      N extends string,
      K,
      Q,
      W,
      X,
      S1,
      S2,
      R,
      E,
      A,
      N1 extends string,
      K1,
      Q1,
      W1,
      X1,
      S3,
      R1,
      E1,
      B
   >(
      fa: HKT.Kind<F, C, N, K, Q, W, X, S1, S2, R, E, A>,
      fb: HKT.Kind<
         F,
         C,
         HKT.Intro<C, "N", N, N1>,
         HKT.Intro<C, "K", K, K1>,
         HKT.Intro<C, "Q", Q, Q1>,
         HKT.Intro<C, "W", W, W1>,
         HKT.Intro<C, "X", X, X1>,
         S2,
         S3,
         HKT.Intro<C, "R", R, R1>,
         HKT.Intro<C, "E", E, E1>,
         B
      >
   ): HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N1, N]>,
      HKT.Mix<C, "K", [K1, K]>,
      HKT.Mix<C, "Q", [Q1, Q]>,
      HKT.Mix<C, "W", [W1, W]>,
      HKT.Mix<C, "X", [X1, X]>,
      S1,
      S3,
      HKT.Mix<C, "R", [R1, R]>,
      HKT.Mix<C, "E", [E1, E]>,
      readonly [A, B]
   >;
}
