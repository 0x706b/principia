import * as A from "../../../Array";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { pipe, tuple } from "../../../Function";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Exit } from "../../Exit";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as T from "../../Task";
import type { Stream } from "../model";
import { combineChunks } from "./combineChunks";

function _zipChunks<A, B, C>(
   fa: ReadonlyArray<A>,
   fb: ReadonlyArray<B>,
   f: (a: A, b: B) => C
): [ReadonlyArray<C>, E.Either<ReadonlyArray<A>, ReadonlyArray<B>>] {
   const fc: C[] = [];
   const len = Math.min(fa.length, fb.length);
   for (let i = 0; i < len; i++) {
      fc[i] = f(fa[i], fb[i]);
   }

   if (fa.length > fb.length) {
      return [fc, E.left(A.dropLeft_(fa, fb.length))];
   }

   return [fc, E.right(A.dropLeft_(fb, fa.length))];
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function mapBothPar_<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "seq"
): Stream<R & R1, E1 | E, O3>;
export function mapBothPar_<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps?: "par" | "seq"
): Stream<R & R1, E1 | E, O3>;
export function mapBothPar_<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "par" | "seq" = "par"
): Stream<R & R1, E1 | E, O3> {
   type End = { _tag: "End" };
   type RightDone<W2> = { _tag: "RightDone"; excessR: NonEmptyArray<W2> };
   type LeftDone<W1> = { _tag: "LeftDone"; excessL: NonEmptyArray<W1> };
   type Running<W1, W2> = {
      _tag: "Running";
      excess: Either<ReadonlyArray<W1>, ReadonlyArray<W2>>;
   };
   type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>;

   const handleSuccess = (
      leftUpd: Option<ReadonlyArray<O>>,
      rightUpd: Option<ReadonlyArray<O2>>,
      excess: Either<ReadonlyArray<O>, ReadonlyArray<O2>>
   ): Exit<Option<never>, readonly [ReadonlyArray<O3>, State<O, O2>]> => {
      const [leftExcess, rightExcess] = pipe(
         excess,
         E.fold(
            (l) => tuple<[ReadonlyArray<O>, ReadonlyArray<O2>]>(l, []),
            (r) => tuple<[ReadonlyArray<O>, ReadonlyArray<O2>]>([], r)
         )
      );

      const [left, right] = [
         pipe(
            leftUpd,
            O.fold(
               () => leftExcess,
               (upd) => [...leftExcess, ...upd] as ReadonlyArray<O>
            )
         ),
         pipe(
            rightUpd,
            O.fold(
               () => rightExcess,
               (upd) => [...rightExcess, ...upd] as ReadonlyArray<O2>
            )
         )
      ];

      const [emit, newExcess] = _zipChunks(left, right, f);

      if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
         return Ex.succeed(
            tuple<[ReadonlyArray<O3>, State<O, O2>]>(emit, {
               _tag: "Running",
               excess: newExcess
            })
         );
      } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
         return Ex.fail(O.none());
      } else {
         return Ex.succeed(
            tuple(
               emit,
               pipe(
                  newExcess,
                  E.fold(
                     (l): State<O, O2> =>
                        A.isNonEmpty(l)
                           ? {
                                _tag: "LeftDone",
                                excessL: l
                             }
                           : { _tag: "End" },
                     (r): State<O, O2> =>
                        A.isNonEmpty(r)
                           ? {
                                _tag: "RightDone",
                                excessR: r
                             }
                           : { _tag: "End" }
                  )
               )
            )
         );
      }
   };

   return pipe(
      stream,
      combineChunks(that)<State<O, O2>>({
         _tag: "Running",
         excess: E.left([])
      })((st, p1, p2) => {
         switch (st._tag) {
            case "End": {
               return T.pure(Ex.fail(O.none()));
            }
            case "Running": {
               return pipe(
                  p1,
                  T.optional,
                  ps === "par"
                     ? T.mapBothPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
                     : T.mapBoth(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(O.some)))))
               );
            }
            case "LeftDone": {
               return pipe(
                  p2,
                  T.optional,
                  T.map((r) => handleSuccess(O.none(), r, E.left(st.excessL))),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(O.some)))))
               );
            }
            case "RightDone": {
               return pipe(
                  p1,
                  T.optional,
                  T.map((l) => handleSuccess(l, O.none(), E.right(st.excessR))),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(O.some)))))
               );
            }
         }
      })
   );
}

export function mapBothPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "seq"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>;
export function mapBothPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps?: "par" | "seq"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>;
export function mapBothPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "par" | "seq" = "par"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3> {
   return (stream) => mapBothPar_(stream, that, f, ps);
}
