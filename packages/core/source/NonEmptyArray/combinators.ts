import { getJoinSemigroup, getMeetSemigroup } from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import type { Ord } from "@principia/prelude/Ord";

import * as A from "../Array";
import type { Option } from "../Option";
import type { ReadonlyRecord } from "../Record";
import type { NonEmptyArray } from "./model";

export const head = <A>(as: NonEmptyArray<A>): A => as[0];

export const tail = <A>(as: NonEmptyArray<A>): ReadonlyArray<A> => as.slice(1);

export const reverse: <A>(as: NonEmptyArray<A>) => NonEmptyArray<A> = A.reverse as any;

export const min = <A>(O: Ord<A>): ((as: NonEmptyArray<A>) => A) => {
   const S = getMeetSemigroup(O);
   return (as) => as.reduce(S.combine_);
};

export const max = <A>(O: Ord<A>): ((as: NonEmptyArray<A>) => A) => {
   const S = getJoinSemigroup(O);
   return (as) => as.reduce(S.combine_);
};

export function append_<A>(xs: ReadonlyArray<A>, ys: NonEmptyArray<A>): NonEmptyArray<A>;
export function append_<A>(xs: NonEmptyArray<A>, ys: ReadonlyArray<A>): NonEmptyArray<A>;
export function append_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> {
   return A.append_(xs, ys);
}

export function append<A>(ys: NonEmptyArray<A>): (xs: ReadonlyArray<A>) => NonEmptyArray<A>;
export function append<A>(ys: ReadonlyArray<A>): (xs: ReadonlyArray<A>) => NonEmptyArray<A>;
export function append<A>(ys: ReadonlyArray<A>): (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
   return (xs) => A.append_(xs, ys);
}

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function group<A>(
   E: Eq<A>
): {
   (as: NonEmptyArray<A>): NonEmptyArray<NonEmptyArray<A>>;
   (as: ReadonlyArray<A>): ReadonlyArray<NonEmptyArray<A>>;
};
export function group<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>> {
   return (as) => {
      const len = as.length;
      if (len === 0) {
         return A.empty();
      }
      const r: Array<NonEmptyArray<A>> = [];
      let head: A = as[0];
      let nea: [A, ...ReadonlyArray<A>] = [head];
      for (let i = 1; i < len; i++) {
         const x = as[i];
         if (E.equals_(x, head)) {
            nea.push(x);
         } else {
            r.push(nea);
            head = x;
            nea = [head];
         }
      }
      r.push(nea);
      return r;
   };
}

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const groupSort = <A>(O: Ord<A>): ((as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>>) => {
   const sortO = A.sort(O);
   const groupO = group(O);
   return (as) => groupO(sortO(as));
};

const _hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @category Combinators
 * @since 1.0.0
 */
export const groupBy = <A>(f: (a: A) => string) => (as: ReadonlyArray<A>): ReadonlyRecord<string, NonEmptyArray<A>> => {
   const r: Record<string, [A, ...ReadonlyArray<A>]> = {};
   for (const a of as) {
      const k = f(a);
      if (_hasOwnProperty.call(r, k)) {
         r[k].push(a);
      } else {
         r[k] = [a];
      }
   }
   return r;
};

/**
 * Get the last elements of a non empty array
 *
 * @since 1.0.0
 */
export const last = <A>(as: NonEmptyArray<A>): A => as[as.length - 1];

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @since 1.0.0
 */
export const init = <A>(as: NonEmptyArray<A>): ReadonlyArray<A> => as.slice(0, -1);

/**
 * @category Combinators
 * @since 1.0.0
 */
export const sort = <A>(O: Ord<A>) => (as: NonEmptyArray<A>): NonEmptyArray<A> => A.sort(O)(as) as any;

export const insertAt_ = <A>(as: NonEmptyArray<A>, i: number, a: A): Option<NonEmptyArray<A>> =>
   A.insertAt_(as, i, a) as any;

export const insertAt = <A>(i: number, a: A) => (as: NonEmptyArray<A>): Option<NonEmptyArray<A>> => insertAt_(as, i, a);

export const updateAt_ = <A>(as: NonEmptyArray<A>, i: number, a: A): Option<NonEmptyArray<A>> =>
   A.updateAt_(as, i, a) as any;

export const updateAt = <A>(i: number, a: A) => (as: NonEmptyArray<A>): Option<NonEmptyArray<A>> => updateAt_(as, i, a);

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export const modifyAt_ = <A>(as: NonEmptyArray<A>, i: number, f: (a: A) => A): Option<NonEmptyArray<A>> =>
   A.modifyAt_(as, i, f) as any;

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export const modifyAt = <A>(i: number, f: (a: A) => A) => (as: NonEmptyArray<A>): Option<NonEmptyArray<A>> =>
   modifyAt_(as, i, f);

/**
 * @since 1.0.0
 */
export const unzip: <A, B>(
   as: NonEmptyArray<readonly [A, B]>
) => readonly [NonEmptyArray<A>, NonEmptyArray<B>] = A.unzip as any;
