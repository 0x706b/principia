import { pipe } from "../../Function";
import type { Exit } from "../Exit";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import * as Ref from "../XRef/_core";
import * as T from "./_internal/task";
import { Managed } from "./model";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";
import { add, addIfOpen, noopFinalizer, release } from "./ReleaseMap";

/**
 * Lift a pure value into a task
 */
export function succeed<A>(a: A) {
  return fromTask(T.pure(a));
}

/**
 * Lifts a `Task<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export function fromTask<R, E, A>(effect: T.Task<R, E, A>) {
  return new Managed<R, E, A>(
    T.map_(
      T.asksM((_: readonly [R, ReleaseMap]) => T.giveAll_(effect, _[0])),
      (a) => [noopFinalizer, a]
    )
  );
}

export function fromTaskUninterruptible<R, E, A>(ma: T.Task<R, E, A>): Managed<R, E, A> {
  return fromTask(T.makeUninterruptible(ma));
}

/**
 * Imports a synchronous side-effect into a Managed
 */
export function total<A>(thunk: () => A): Managed<unknown, never, A> {
  return fromTask(T.total(thunk));
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 */
export function partial_<E, A>(
  thunk: () => A,
  onThrow: (error: unknown) => E
): Managed<unknown, E, A> {
  return fromTask(T.partial_(thunk, onThrow));
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 */
export function partial<E>(
  onThrow: (error: unknown) => E
): <A>(thunk: () => A) => Managed<unknown, E, A> {
  return (thunk) => partial_(thunk, onThrow);
}

/**
 * Returns a Managed that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export function fail<E>(e: E): Managed<unknown, E, never> {
  return fromTask(T.fail(e));
}

/**
 * Returns a Managed that models failure with the specified `Cause`.
 */
export function halt<E>(cause: Cause<E>): Managed<unknown, E, never> {
  return fromTask(T.halt(cause));
}

/**
 * Returns a Managed that dies with the specified error
 */
export function die(error: unknown): Managed<unknown, never, never> {
  return halt(C.die(error));
}

/**
 * Creates a task that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export function finalizerRef(initial: Finalizer) {
  return makeExit_(Ref.make(initial), (ref, exit) => T.chain_(ref.get, (f) => f(exit)));
}

/**
 * Lifts a `Task<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make<R1, A>(
  release: (a: A) => T.Task<R1, never, unknown>
): <R, E>(acquire: T.Task<R, E, A>) => Managed<R & R1, E, A> {
  return makeExit((a) => release(a));
}

/**
 * Lifts a `Task<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make_<R, E, A, R1>(
  acquire: T.Task<R, E, A>,
  release: (a: A) => T.Task<R1, never, unknown>
): Managed<R & R1, E, A> {
  return makeExit_(acquire, (a) => release(a));
}

/**
 * Lifts a `Task<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit<R1, A>(
  release: (a: A, exit: Exit<any, any>) => T.Task<R1, never, unknown>
): <R, E>(acquire: T.Task<R, E, A>) => Managed<R & R1, E, A> {
  return (acquire) => makeExit_(acquire, release);
}

/**
 * Lifts a `Task<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit_<R, E, A, R1>(
  acquire: T.Task<R, E, A>,
  release: (a: A, exit: Exit<any, any>) => T.Task<R1, never, unknown>
): Managed<R & R1, E, A> {
  return new Managed<R & R1, E, A>(
    T.makeUninterruptible(
      pipe(
        T.do,
        T.bindS("r", () => T.ask<readonly [R & R1, ReleaseMap]>()),
        T.bindS("a", (s) => T.giveAll_(acquire, s.r[0])),
        T.bindS("rm", (s) => add((ex) => T.giveAll_(release(s.a, ex), s.r[0]))(s.r[1])),
        T.map((s) => [s.rm, s.a])
      )
    )
  );
}

/**
 * Creates a `Managed` from a `Reservation` produced by a task. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export function makeReserve<R, E, R2, E2, A>(reservation: T.Task<R, E, Reservation<R2, E2, A>>) {
  return new Managed<R & R2, E | E2, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bindS("tp", () => T.ask<readonly [R & R2, ReleaseMap]>()),
        T.letS("r", (s) => s.tp[0]),
        T.letS("releaseMap", (s) => s.tp[1]),
        T.bindS("reserved", (s) => T.giveAll_(reservation, s.r)),
        T.bindS("releaseKey", (s) =>
          addIfOpen((x) => T.giveAll_(s.reserved.release(x), s.r))(s.releaseMap)
        ),
        T.bindS("finalizerAndA", (s) => {
          const k = s.releaseKey;
          switch (k._tag) {
            case "None": {
              return T.interrupt;
            }
            case "Some": {
              return T.map_(
                restore(T.gives_(s.reserved.acquire, ([r]: readonly [R & R2, ReleaseMap]) => r)),
                (a): [Finalizer, A] => [(e) => release(k.value, e)(s.releaseMap), a]
              );
            }
          }
        }),
        T.map((s) => s.finalizerAndA)
      )
    )
  );
}

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 */
export class Reservation<R, E, A> {
  static of = <R, E, A, R2>(
    acquire: T.Task<R, E, A>,
    release: (exit: Exit<any, any>) => T.Task<R2, never, any>
  ) => new Reservation<R & R2, E, A>(acquire, release);

  private constructor(
    readonly acquire: T.Task<R, E, A>,
    readonly release: (exit: Exit<any, any>) => T.Task<R, never, any>
  ) {}
}

/**
 * Make a new reservation
 */
export function makeReservation_<R, E, A, R2>(
  acquire: T.Task<R, E, A>,
  release: (exit: Exit<any, any>) => T.Task<R2, never, any>
): Reservation<R & R2, E, A> {
  return Reservation.of(acquire, release);
}

/**
 * Make a new reservation
 */
export function makeReservation<R2>(
  release: (exit: Exit<any, any>) => T.Task<R2, never, any>
): <R, E, A>(acquire: T.Task<R, E, A>) => Reservation<R & R2, E, A> {
  return (acquire) => Reservation.of(acquire, release);
}

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export function reserve<R, E, A>(reservation: Reservation<R, E, A>): Managed<R, E, A> {
  return makeReserve(T.pure(reservation));
}
