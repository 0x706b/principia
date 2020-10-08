import type { Option } from "@principia/core/Option";
import { none, some } from "@principia/core/Option";

import * as T from "../../Effect/core";
import type { IO, UIO } from "../../Effect/Effect";
import type { XPromise } from "../XPromise";

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export const poll = <E, A>(promise: XPromise<E, A>): UIO<Option<IO<E, A>>> =>
   T.total(() => {
      const state = promise.state.get;

      switch (state._tag) {
         case "Done": {
            return some(state.value);
         }
         case "Pending": {
            return none();
         }
      }
   });
