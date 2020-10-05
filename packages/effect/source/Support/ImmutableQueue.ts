import * as A from "@principia/core/Array";
import { just, nothing } from "@principia/core/Maybe";
import * as NA from "@principia/core/NonEmptyArray";

export class ImmutableQueue<A> {
   constructor(private readonly backing: readonly A[]) {}

   push(a: A) {
      return new ImmutableQueue([...this.backing, a]);
   }

   prepend(a: A) {
      return new ImmutableQueue([a, ...this.backing]);
   }

   get size() {
      return this.backing.length;
   }

   dequeue() {
      if (A.isNonEmpty(this.backing)) {
         return just([NA.head(this.backing), new ImmutableQueue(NA.tail(this.backing))] as const);
      } else {
         return nothing();
      }
   }

   find(f: (a: A) => boolean) {
      return A.findr(f)(this.backing);
   }

   filter(f: (a: A) => boolean) {
      return new ImmutableQueue(A.filter(f)(this.backing));
   }
}
