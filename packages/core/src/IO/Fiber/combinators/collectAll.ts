import * as A from "../../../Array/_core";
import { pipe } from "../../../Function";
import { none, some } from "../../../Option";
import * as O from "../../../Option";
import * as C from "../../Cause";
import * as Ex from "../../Exit";
import * as I from "../_internal/io";
import type { Fiber } from "../model";
import { makeSynthetic } from "../model";
import { awaitAll } from "./awaitAll";

/**
 * ```haskell
 * collectAll :: Fiber f => Iterable (f e a) -> f e [a]
 * ```
 *
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export const collectAll = <E, A>(fibers: Iterable<Fiber<E, A>>) =>
  makeSynthetic({
    _tag: "SyntheticFiber",
    getRef: (ref) =>
      I.reduce_(fibers, ref.initial, (a, fiber) =>
        pipe(
          fiber.getRef(ref),
          I.map((a2) => ref.join(a, a2))
        )
      ),
    inheritRefs: I.foreachUnit_(fibers, (f) => f.inheritRefs),
    interruptAs: (fiberId) =>
      pipe(
        I.foreach_(fibers, (f) => f.interruptAs(fiberId)),
        I.map(
          A.reduceRight(Ex.succeed(A.empty) as Ex.Exit<E, ReadonlyArray<A>>, (a, b) =>
            Ex.zipWithCause_(a, b, (_a, _b) => [_a, ..._b], C.both)
          )
        )
      ),
    poll: pipe(
      I.foreach_(fibers, (f) => f.poll),
      I.map(
        A.reduceRight(some(Ex.succeed(A.empty) as Ex.Exit<E, readonly A[]>), (a, b) =>
          O.fold_(
            a,
            () => none(),
            (ra) =>
              O.fold_(
                b,
                () => none(),
                (rb) => some(Ex.zipWithCause_(ra, rb, (_a, _b) => [_a, ..._b], C.both))
              )
          )
        )
      )
    ),
    await: awaitAll(fibers)
  });