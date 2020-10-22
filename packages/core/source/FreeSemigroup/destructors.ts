import type { Predicate } from "../Function";
import type { Stack } from "../Stack";
import * as S from "../Stack";
import type { Filter, FreeSemigroup, Map } from "./model";

/*
 * -------------------------------------------
 * FreeSemigroup Destructors
 * -------------------------------------------
 */

/**
 * @category Destructors
 * @since 1.0.0
 */
export const fold_ = <A, R>(
   f: FreeSemigroup<A>,
   patterns: {
      Empty: () => R;
      Element: (value: A) => R;
      Filter: (fa: FreeSemigroup<A>, f: Predicate<A>) => R;
      Map: (fa: FreeSemigroup<A>, f: (a: A) => A) => R;
      Combine: (l: FreeSemigroup<A>, r: FreeSemigroup<A>) => R;
   }
): R => {
   switch (f._tag) {
      case "Empty":
         return patterns.Empty();
      case "Element":
         return patterns.Element(f.value);
      case "Combine":
         return patterns.Combine(f.left, f.right);
      case "Filter":
         return patterns.Filter(f.fa, f.f);
      case "Map":
         return patterns.Map(f.fa, f.f);
   }
};

/**
 * @category Destructors
 * @since 1.0.0
 */
export const fold = <A, R>(patterns: {
   Empty: () => R;
   Element: (value: A) => R;
   Filter: (fa: FreeSemigroup<A>, f: Predicate<A>) => R;
   Map: (fa: FreeSemigroup<A>, f: (a: A) => A) => R;
   Combine: (l: FreeSemigroup<A>, r: FreeSemigroup<A>) => R;
}) => (f: FreeSemigroup<A>): R => fold_(f, patterns);

type Ops<A> = Filter<A> | Map<A>;

/**
 * https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/system/src/FreeAssociative/index.ts
 *
 * @category Destructors
 * @since 1.0.0
 */
export const toArray = <A>(fs: FreeSemigroup<A>): ReadonlyArray<A> => {
   const as: Array<A> = [];
   let current: FreeSemigroup<A> | undefined = fs;
   let stack: Stack<FreeSemigroup<A>> | undefined = undefined;
   let ops: Stack<Ops<A>> | undefined = undefined;

   while (current !== undefined) {
      switch (current._tag) {
         case "Empty": {
            current = undefined;
            break;
         }
         case "Element": {
            if (ops !== undefined) {
               let op: Stack<Ops<A>> | undefined = ops;
               let drop = false;
               let a = current.value;
               while (op !== undefined && !drop) {
                  switch (op.value._tag) {
                     case "Filter": {
                        if (!op.value.f(a)) {
                           drop = true;
                        }
                        break;
                     }
                     case "Map": {
                        a = op.value.f(a);
                        break;
                     }
                  }
                  op = op.previous;
               }
               if (!drop) as.push(a);
            } else {
               as.push(current.value);
            }
            break;
         }
         case "Filter": {
            ops = S.stack(current, ops);
            current = current.fa;
            break;
         }
         case "Map": {
            ops = S.stack(current, ops);
            current = current.fa;
            break;
         }
         case "Combine": {
            const p: any = stack;
            stack = S.stack(current.right, p);
            current = current.left;
            break;
         }
      }

      if (current === undefined) {
         if (stack !== undefined) {
            current = stack.value;
            stack = stack.previous;
         }
      }
   }

   return as;
};
