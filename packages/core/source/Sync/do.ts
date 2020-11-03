import { deriveDo } from "@principia/prelude";

import { succeed } from "./constructors";
import type { Sync } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Do Async
 * -------------------------------------------
 */

export const Do = deriveDo(Monad);

const of: Sync<unknown, never, {}> = succeed({});
export { of as do };

export const letS: <K, N extends string, A>(
   name: Exclude<N, keyof K>,
   f: (_: K) => A
) => <R, E>(
   mk: Sync<R, E, K>
) => Sync<
   R,
   E,
   {
      [k in N | keyof K]: k extends keyof K ? K[k] : A;
   }
> = Do.letS;

export const bindS: <R, E, A, K, N extends string>(
   name: Exclude<N, keyof K>,
   f: (_: K) => Sync<R, E, A>
) => <R2, E2>(
   mk: Sync<R2, E2, K>
) => Sync<
   R & R2,
   E | E2,
   {
      [k in N | keyof K]: k extends keyof K ? K[k] : A;
   }
> = Do.bindS;

export const bindToS: <K, N extends string>(
   name: Exclude<N, keyof K>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R, E, { [k in Exclude<N, keyof K>]: A }> = Do.bindToS;
