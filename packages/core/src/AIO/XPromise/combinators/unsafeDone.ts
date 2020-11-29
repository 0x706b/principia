import type { EIO } from "../../AIO/model";
import type { XPromise } from "../model";
import { Done } from "../state";

/**
 * Unsafe version of done
 */
export function unsafeDone<E, A>(io: EIO<E, A>) {
  return (promise: XPromise<E, A>) => {
    const state = promise.state.get;

    if (state._tag === "Pending") {
      promise.state.set(new Done(io));

      Array.from(state.joiners)
        .reverse()
        .forEach((f) => {
          f(io);
        });
    }
  };
}
