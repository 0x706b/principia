import * as A from "../Array";
import { identity, pipe } from "../Function";
import * as I from "../IO";
import * as XR from "../IORef";
import * as M from "../Managed";
import * as RM from "../Managed/ReleaseMap";
import type { Option } from "../Option";
import { Chain, Stream } from "./model";
import * as Pull from "./Pull";

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain_<R, E, A, Q, D, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => Stream<Q, D, B>
): Stream<R & Q, E | D, B> {
  type R_ = R & Q;
  type E_ = E | D;

  return new Stream(
    pipe(
      M.do,
      M.bindS("outerStream", () => ma.proc),
      M.bindS("currOuterChunk", () =>
        I.toManaged()(
          XR.make<[ReadonlyArray<A>, number]>([A.empty(), 0])
        )
      ),
      M.bindS("currInnerStream", () =>
        I.toManaged()(XR.make<I.IO<R_, Option<E_>, ReadonlyArray<B>>>(Pull.end))
      ),
      M.bindS(
        "innerFinalizer",
        () => M.finalizerRef(RM.noopFinalizer) as M.Managed<R_, never, XR.URef<RM.Finalizer>>
      ),
      M.map(({ currInnerStream, currOuterChunk, innerFinalizer, outerStream }) =>
        new Chain(f, outerStream, currOuterChunk, currInnerStream, innerFinalizer).apply()
      )
    )
  );
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain<A, Q, D, B>(
  f: (a: A) => Stream<Q, D, B>
): <R, E>(ma: Stream<R, E, A>) => Stream<Q & R, D | E, B> {
  return (ma) => chain_(ma, f);
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R, E, Q, D, A>(
  ffa: Stream<R, E, Stream<Q, D, A>>
): Stream<Q & R, D | E, A> {
  return chain_(ffa, identity);
}
