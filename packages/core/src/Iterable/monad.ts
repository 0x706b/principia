import { identity } from "../Function";

/*
 * -------------------------------------------
 * Monad Iterable
 * -------------------------------------------
 */

function* genChain<A, B>(ia: Iterator<A>, f: (a: A) => Iterable<B>) {
   while (true) {
      const result = ia.next();
      if (result.done) {
         break;
      }
      const ib = f(result.value)[Symbol.iterator]();
      while (true) {
         const result = ib.next();
         if (result.done) {
            break;
         }
         yield result.value;
      }
   }
}

export function chain<A, B>(f: (a: A) => Iterable<B>): (ma: Iterable<A>) => Iterable<B> {
   return (ma) => ({
      [Symbol.iterator]: () => genChain(ma[Symbol.iterator](), f)
   });
}

export function chain_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
   return {
      [Symbol.iterator]: () => genChain(ma[Symbol.iterator](), f)
   };
}

export function flatten<A>(mma: Iterable<Iterable<A>>): Iterable<A> {
   return chain_(mma, identity);
}
