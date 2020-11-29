import * as T from "../../AIO/_core";
import type { EIO, IO } from "../../AIO/model";
import type { XPromise } from "../model";
import { Done } from "../state";

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an AIO, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an AIO see
 * `Promise.complete`.
 */
export function completeWith<E, A>(io: EIO<E, A>) {
  return (promise: XPromise<E, A>): IO<boolean> =>
    T.total(() => {
      const state = promise.state.get;

      switch (state._tag) {
        case "Done": {
          return false;
        }
        case "Pending": {
          promise.state.set(new Done(io));
          state.joiners.forEach((f) => {
            f(io);
          });
          return true;
        }
      }
    });
}
