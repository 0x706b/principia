import { pipe } from "@principia/core/Function";
import type { V as Variance } from "@principia/core/HKT";
import { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import * as C from "../Cause";
import * as T from "../Effect";
import { sequential } from "../ExecutionStrategy";
import * as Ex from "../Exit";
import * as M from "../Managed";
import * as XR from "../XRef";
import * as Pull from "./internal/Pull";

export const URI = "Stream";
export type URI = typeof URI;

export type V = Variance<"R", "-"> & Variance<"E", "+">;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Stream<R, E, A>;
   }
}

/**
 * A `Stream<X, R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R` and can be sync or async `X`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * This data type can emit multiple `A` values through multiple calls to `next`.
 * Similarly, embedded inside every `Stream` is an Effect program: `Effect<X, R, Maybe<E>, ReadonlyArray<A>>`.
 * This program will be repeatedly evaluated as part of the stream execution. For
 * every evaluation, it will emit a chunk of values or end with an optional failure.
 * A failure of type `None` signals the end of the stream.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operatrs. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * The last important attribute of `Stream` is resource management: it makes
 * heavy use of `Managed` to manage resources that are acquired
 * and released during the stream's lifetime.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 *
 * The current encoding of `Stream` is *not* safe for recursion. `Stream` programs
 * that are defined in terms of themselves will leak memory.
 *
 * Instead, recursive operators must be defined explicitly. See the definition of
 * `forever` for an example. This limitation will be lifted in the future.
 */
export class Stream<R, E, A> {
   readonly [T._U]: URI;
   readonly [T._E]: () => E;
   readonly [T._A]: () => A;
   readonly [T._R]: (_: R) => void;

   constructor(readonly proc: M.Managed<R, never, T.Effect<R, Maybe<E>, ReadonlyArray<A>>>) {}
}

/**
 * Type aliases
 */
export type UIO<A> = Stream<unknown, never, A>;
export type RIO<R, A> = Stream<R, never, A>;
export type IO<E, A> = Stream<unknown, E, A>;

/**
 * The default chunk size used by the various combinators and constructors of [[Stream]].
 */
export const DefaultChunkSize = 4096;

/**
 * @internal
 */
export class Chain<R_, E_, O, O2> {
   constructor(
      readonly f0: (a: O) => Stream<R_, E_, O2>,
      readonly outerStream: T.Effect<R_, Maybe<E_>, ReadonlyArray<O>>,
      readonly currOuterChunk: XR.Ref<[ReadonlyArray<O>, number]>,
      readonly currInnerStream: XR.Ref<T.Effect<R_, Maybe<E_>, ReadonlyArray<O2>>>,
      readonly innerFinalizer: XR.Ref<M.Finalizer>
   ) {
      this.apply = this.apply.bind(this);
      this.closeInner = this.closeInner.bind(this);
      this.pullNonEmpty = this.pullNonEmpty.bind(this);
      this.pullOuter = this.pullOuter.bind(this);
   }

   closeInner() {
      return pipe(
         this.innerFinalizer,
         XR.getAndSet(M.noopFinalizer),
         T.chain((f) => f(Ex.unit))
      );
   }

   pullNonEmpty<R, E, O>(
      pull: T.Effect<R, Maybe<E>, ReadonlyArray<O>>
   ): T.Effect<R, Maybe<E>, ReadonlyArray<O>> {
      return pipe(
         pull,
         T.chain((os) => (os.length > 0 ? T.pure(os) : this.pullNonEmpty(pull)))
      );
   }

   pullOuter() {
      return pipe(
         this.currOuterChunk,
         XR.modify(([chunk, nextIdx]): [T.Effect<R_, Maybe<E_>, O>, [ReadonlyArray<O>, number]] => {
            if (nextIdx < chunk.length) {
               return [T.pure(chunk[nextIdx]), [chunk, nextIdx + 1]];
            } else {
               return [
                  pipe(
                     this.pullNonEmpty(this.outerStream),
                     T.chainFirst((os) => this.currOuterChunk.set([os, 1])),
                     T.map((os) => os[0])
                  ),
                  [chunk, nextIdx]
               ];
            }
         }),
         T.flatten,
         T.chain((o) =>
            T.uninterruptibleMask(({ restore }) =>
               pipe(
                  T.of,
                  T.bindS("releaseMap", () => M.makeReleaseMap),
                  T.bindS("pull", ({ releaseMap }) =>
                     restore(
                        pipe(
                           this.f0(o).proc.effect,
                           T.provideSome((_: R_) => [_, releaseMap] as [R_, M.ReleaseMap]),
                           T.map(([_, x]) => x)
                        )
                     )
                  ),
                  T.chainFirst(({ pull }) => this.currInnerStream.set(pull)),
                  T.chainFirst(({ releaseMap }) =>
                     this.innerFinalizer.set((e) => M.releaseAll(e, sequential())(releaseMap))
                  ),
                  T.asUnit
               )
            )
         )
      );
   }

   apply(): T.Effect<R_, Maybe<E_>, ReadonlyArray<O2>> {
      return pipe(
         this.currInnerStream.get,
         T.flatten,
         T.catchAllCause((c) =>
            pipe(
               c,
               C.sequenceCauseMaybe,
               Mb.fold(
                  // The additional switch is needed to eagerly run the finalizer
                  // *before* pulling another element from the outer stream.
                  () =>
                     pipe(
                        this.closeInner(),
                        T.chain(() => this.pullOuter()),
                        T.chain(() =>
                           new Chain(
                              this.f0,
                              this.outerStream,
                              this.currOuterChunk,
                              this.currInnerStream,
                              this.innerFinalizer
                           ).apply()
                        )
                     ),
                  Pull.halt
               )
            )
         )
      );
   }
}
