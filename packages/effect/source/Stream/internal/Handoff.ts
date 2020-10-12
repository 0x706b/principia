import { constVoid, pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import { none, some } from "@principia/core/Option";
import { matchTag } from "@principia/prelude/Utils";

import * as T from "../../Effect";
import * as XP from "../../XPromise";
import * as XR from "../../XRef";

type State<A> = Empty | Full<A>;

class Empty {
   readonly _tag = "Empty";
   constructor(readonly notifyConsumer: XP.XPromise<never, void>) {}
}

class Full<A> {
   readonly _tag = "Full";
   constructor(readonly a: A, readonly notifyProducer: XP.XPromise<never, void>) {}
}

/**
 * A synchronous queue-like abstraction that allows a producer to offer
 * an element and wait for it to be taken, and allows a consumer to wait
 * for an element to be available.
 */
class Handoff<A> {
   readonly _tag = "Handoff";
   constructor(readonly ref: XR.Ref<State<A>>) {}
}

export function make<A>(): T.UIO<Handoff<A>> {
   return pipe(
      XP.make<never, void>(),
      T.chain((p) => XR.makeRef<State<A>>(new Empty(p))),
      T.map((ref) => new Handoff(ref))
   );
}

export function offer<A>(a: A) {
   return (h: Handoff<A>): T.UIO<void> =>
      pipe(
         XP.make<never, void>(),
         T.chain((p) =>
            pipe(
               h.ref,
               XR.modify<T.UIO<void>, State<A>>(
                  matchTag({
                     Empty: ({ notifyConsumer }) =>
                        [
                           pipe(notifyConsumer, XP.succeed(constVoid()), T.apSecond(XP.await(p))),
                           new Full(a, p)
                        ] as const,
                     Full: (s) =>
                        [
                           pipe(
                              XP.await(s.notifyProducer),
                              T.chain(() => offer(a)(h))
                           ),
                           s
                        ] as const
                  })
               ),
               T.flatten
            )
         )
      );
}

export function take<A>(h: Handoff<A>): T.UIO<A> {
   return pipe(
      XP.make<never, void>(),
      T.chain((p) =>
         pipe(
            h.ref,
            XR.modify<T.UIO<A>, State<A>>(
               matchTag({
                  Empty: (s) =>
                     [
                        pipe(
                           s.notifyConsumer,
                           XP.await,
                           T.chain(() => take(h))
                        ),
                        s
                     ] as const,
                  Full: ({ a, notifyProducer }) =>
                     [pipe(notifyProducer, XP.succeed(constVoid()), T.as(a)), new Empty(p)] as const
               })
            ),
            T.flatten
         )
      )
   );
}

export function poll<A>(h: Handoff<A>): T.UIO<Option<A>> {
   return pipe(
      XP.make<never, void>(),
      T.chain((p) =>
         pipe(
            h.ref,
            XR.modify<T.UIO<Option<A>>, State<A>>(
               matchTag({
                  Empty: (s) => [T.succeed(none()), s] as const,
                  Full: ({ a, notifyProducer }) =>
                     [pipe(notifyProducer, XP.succeed(constVoid()), T.as(some(a))), new Empty(p)] as const
               })
            ),
            T.flatten
         )
      )
   );
}
