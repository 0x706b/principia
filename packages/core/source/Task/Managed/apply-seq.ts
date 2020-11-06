import type { EnforceNonEmptyRecord } from "@principia/prelude/Utils";

import { identity } from "../../Function";
import type { ReadonlyRecord } from "../../Record";
import * as R from "../../Record";
import type { _E, _R } from "../../support/utils";
import { foreach_ } from "./combinators/foreach";
import { map_ } from "./functor";
import type { Managed } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Sequential Apply Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth = <A, R1, E1, B, C>(fb: Managed<R1, E1, B>, f: (a: A, b: B) => C) => <R, E>(
   fa: Managed<R, E, A>
) => mapBoth_(fa, fb, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth_ = <R, E, A, R1, E1, B, C>(fa: Managed<R, E, A>, fb: Managed<R1, E1, B>, f: (a: A, b: B) => C) =>
   chain_(fa, (a) => map_(fb, (a2) => f(a, a2)));

export const ap_ = <R, E, A, Q, D, B>(
   fab: Managed<Q, D, (a: A) => B>,
   fa: Managed<R, E, A>
): Managed<Q & R, D | E, B> => mapBoth_(fab, fa, (f, a) => f(a));

export const ap = <R, E, A>(fa: Managed<R, E, A>) => <Q, D, B>(
   fab: Managed<Q, D, (a: A) => B>
): Managed<Q & R, D | E, B> => ap_(fab, fa);

export const apFirst_ = <R, E, A, R1, E1, B>(
   fa: Managed<R, E, A>,
   fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A> => mapBoth_(fa, fb, (a, _) => a);

export const apFirst = <R1, E1, B>(fb: Managed<R1, E1, B>) => <R, E, A>(
   fa: Managed<R, E, A>
): Managed<R & R1, E | E1, A> => apFirst_(fa, fb);

export const apSecond_ = <R, E, A, R1, E1, B>(
   fa: Managed<R, E, A>,
   fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> => mapBoth_(fa, fb, (_, b) => b);

export const apSecond = <R1, E1, B>(fb: Managed<R1, E1, B>) => <R, E, A>(
   fa: Managed<R, E, A>
): Managed<R & R1, E | E1, B> => apSecond_(fa, fb);

export const struct = <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
   mr: EnforceNonEmptyRecord<MR> & Record<string, Managed<any, any, any>>
): Managed<
   _R<MR[keyof MR]>,
   _E<MR[keyof MR]>,
   {
      [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never;
   }
> =>
   map_(
      foreach_(
         R.collect_(mr, (k, v) => [k, v] as const),
         ([k, v]) => map_(v, (a) => [k, a] as const)
      ),
      (kvs) => {
         const r = {};
         for (let i = 0; i < kvs.length; i++) {
            const [k, v] = kvs[i];
            r[k] = v;
         }
         return r;
      }
   ) as any;

export const tuple = <T extends ReadonlyArray<Managed<any, any, any>>>(
   ...mt: T & {
      0: Managed<any, any, any>;
   }
): Managed<_R<T[number]>, _E<T[number]>, { [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never }> =>
   foreach_(mt, identity) as any;
