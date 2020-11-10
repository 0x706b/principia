function* genCombine<A>(ia: Iterator<A>, ib: Iterator<A>) {
   while (true) {
      const result = ia.next();
      if (result.done) {
         break;
      }
      yield result.value;
   }
   while (true) {
      const result = ib.next();
      if (result.done) {
         break;
      }
      yield result.value;
   }
}

export const append_ = <A>(fa: Iterable<A>, fb: Iterable<A>): Iterable<A> => ({
   [Symbol.iterator]: () => genCombine(fa[Symbol.iterator](), fb[Symbol.iterator]())
});
