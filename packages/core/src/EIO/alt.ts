import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor } from "./functor";
import type { EIO, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Alt EIO
 * -------------------------------------------
 */

export function alt_<E, A, G>(fa: EIO<E, A>, that: () => EIO<G, A>): EIO<E | G, A> {
   return chain_(fa, that);
}

export function alt<A, G>(that: () => EIO<G, A>): <E>(fa: EIO<E, A>) => EIO<G | E, A> {
   return (fa) => alt_(fa, that);
}

/**
 * @category Alt
 * @since 1.0.0
 */
export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});
