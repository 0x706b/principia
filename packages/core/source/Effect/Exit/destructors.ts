import type * as C from "../Cause";
import type { Effect } from "../Effect/model";
import type { Exit } from "./Exit";

/**
 * Folds over the value or cause.
 */
export const foldM_ = <E, A, R1, E1, A1, R2, E2, A2>(
   exit: Exit<E, A>,
   onFailure: (e: C.Cause<E>) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R1 & R2, E1 | E2, A1 | A2> => {
   switch (exit._tag) {
      case "Success": {
         return onSuccess(exit.value);
      }
      case "Failure": {
         return onFailure(exit.cause);
      }
   }
};

export const foldM = <E, A, R1, E1, A1, R2, E2, A2>(
   onFailure: (e: C.Cause<E>) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => (exit: Exit<E, A>) => foldM_(exit, onFailure, onSuccess);
