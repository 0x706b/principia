import type { AIO } from "../AIO/model";
import type * as C from "./Cause";
import type { Exit } from "./model";

export function fold_<E, A, B>(
  exit: Exit<E, A>,
  onFailure: (e: C.Cause<E>) => B,
  onSuccess: (a: A) => B
): B {
  switch (exit._tag) {
    case "Success": {
      return onSuccess(exit.value);
    }
    case "Failure": {
      return onFailure(exit.cause);
    }
  }
}

export function fold<E, A, B>(
  onFailure: (e: C.Cause<E>) => B,
  onSuccess: (a: A) => B
): (exit: Exit<E, A>) => B {
  return (exit) => fold_(exit, onFailure, onSuccess);
}

/**
 * Folds over the value or cause.
 */
export function foldM_<E, A, R1, E1, A1, R2, E2, A2>(
  exit: Exit<E, A>,
  onFailure: (e: C.Cause<E>) => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): AIO<R1 & R2, E1 | E2, A1 | A2> {
  switch (exit._tag) {
    case "Success": {
      return onSuccess(exit.value);
    }
    case "Failure": {
      return onFailure(exit.cause);
    }
  }
}

export function foldM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (e: C.Cause<E>) => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): (exit: Exit<E, A>) => AIO<R1 & R2, E1 | E2, A1 | A2> {
  return (exit) => foldM_(exit, onFailure, onSuccess);
}
