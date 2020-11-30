import { unit } from "../_core";
import type { Exit } from "../Exit";
import type { IO } from "../model";
import { bracketExit_ } from "./bracket";

export function onExit_<R, E, A, R2, E2>(
  self: IO<R, E, A>,
  cleanup: (exit: Exit<E, A>) => IO<R2, E2, any>
): IO<R & R2, E | E2, A> {
  return bracketExit_(
    unit(),
    () => self,
    (_, e) => cleanup(e)
  );
}

export const onExit = <E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => IO<R2, E2, any>) => <R>(
  self: IO<R, E, A>
): IO<R & R2, E | E2, A> => onExit_(self, cleanup);
