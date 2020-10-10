import { bind_, bindTo_, flow, pipe } from "@principia/core/Function";
import type * as TC from "@principia/prelude";

import type { Cause } from "../Cause";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import { makeRef } from "../XRef/combinators";
import * as T from "./_internal/effect";
import type { Managed, URI, V } from "./Managed";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";
import { add, addIfOpen, noopFinalizer, release } from "./ReleaseMap";

export type { Managed, UIO, RIO, IO } from "./Managed";

export const managed = <R, E, A>(
   effect: T.Effect<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>
): Managed<R, E, A> =>
   ({
      effect
   } as Managed<R, E, A>);

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export const fromEffect = <R, E, A>(effect: T.Effect<R, E, A>) =>
   managed<R, E, A>(
      T.map_(
         T.asksM((_: readonly [R, ReleaseMap]) => T.giveAll_(effect, _[0])),
         (a) => [noopFinalizer, a]
      )
   );

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain = <R1, E1, A, A1>(f: (a: A) => Managed<R1, E1, A1>) => <R, E>(self: Managed<R, E, A>) =>
   chain_(self, f);

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain_ = <R, E, A, R1, E1, A1>(self: Managed<R, E, A>, f: (a: A) => Managed<R1, E1, A1>) =>
   managed<R & R1, E | E1, A1>(
      T.chain_(self.effect, ([releaseSelf, a]) =>
         T.map_(f(a).effect, ([releaseThat, b]) => [
            (e) =>
               T.chain_(T.result(releaseThat(e)), (e1) =>
                  T.chain_(T.result(releaseSelf(e1)), (e2) => T.done(Ex.apSecond_(e1, e2)))
               ),
            b
         ])
      )
   );

/**
 * Imports a synchronous side-effect into a pure value
 */
export const total = <A>(effect: () => A) => fromEffect(T.total(effect));

/**
 * Returns an effect that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export const fail = <E>(e: E) => fromEffect(T.fail(e));

/**
 * Creates an effect that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export const finalizerRef = (initial: Finalizer) =>
   makeExit_(makeRef(initial), (ref, exit) => T.chain_(ref.get, (f) => f(exit)));

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   f: (cause: Cause<E>) => Managed<R1, E1, A1>,
   g: (a: A) => Managed<R2, E2, A2>
) => <R>(self: Managed<R, E, A>) => foldCauseM_(self, f, g);

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   self: Managed<R, E, A>,
   f: (cause: Cause<E>) => Managed<R1, E1, A1>,
   g: (a: A) => Managed<R2, E2, A2>
) =>
   managed<R & R1 & R2, E1 | E2, A1 | A2>(
      pipe(
         self.effect,
         T.foldCauseM(
            (c) => f(c).effect,
            ([_, a]) => g(a).effect
         )
      )
   );

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export const foreach = <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) => foreach_(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export const foreach_ = <R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>) =>
   managed<R, E, readonly B[]>(
      T.map_(
         T.foreach_(as, (a) => f(a).effect),
         (res) => {
            const fins = res.map((k) => k[0]);
            const as = res.map((k) => k[1]);

            return [(e) => T.foreach_(fins.reverse(), (fin) => fin(e)), as];
         }
      )
   );

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export const make = <R1, A>(
   release: (a: A) => T.Effect<R1, never, unknown>
): (<R, E>(acquire: T.Effect<R, E, A>) => Managed<R & R1, E, A>) => makeExit((a) => release(a));

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export const make_ = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A) => T.Effect<R1, never, unknown>
): Managed<R & R1, E, A> => makeExit_(acquire, (a) => release(a));

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit = <R1, A>(release: (a: A, exit: Exit<any, any>) => T.Effect<R1, never, unknown>) => <R, E>(
   acquire: T.Effect<R, E, A>
) => makeExit_(acquire, release);

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit_ = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A, exit: Exit<any, any>) => T.Effect<R1, never, unknown>
) =>
   managed<R & R1, E, A>(
      T.makeUninterruptible(
         pipe(
            T.of,
            T.bindS("r", () => T.ask<readonly [R & R1, ReleaseMap]>()),
            T.bindS("a", (s) => T.giveAll_(acquire, s.r[0])),
            T.bindS("rm", (s) => add((ex) => T.giveAll_(release(s.a, ex), s.r[0]))(s.r[1])),
            T.map((s) => [s.rm, s.a])
         )
      )
   );

/**
 * Creates a `Managed` from a `Reservation` produced by an effect. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export const makeReserve = <R, E, X2, R2, E2, A>(reservation: T.Effect<R, E, Reservation<R2, E2, A>>) =>
   managed<R & R2, E | E2, A>(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.ask<readonly [R & R2, ReleaseMap]>()),
            T.letS("r", (s) => s.tp[0]),
            T.letS("releaseMap", (s) => s.tp[1]),
            T.bindS("reserved", (s) => T.giveAll_(reservation, s.r)),
            T.bindS("releaseKey", (s) => addIfOpen((x) => T.giveAll_(s.reserved.release(x), s.r))(s.releaseMap)),
            T.bindS("finalizerAndA", (s) => {
               const k = s.releaseKey;
               switch (k._tag) {
                  case "None": {
                     return T.interrupt;
                  }
                  case "Some": {
                     return T.map_(
                        restore(T.local_(s.reserved.acquire, ([r]: readonly [R & R2, ReleaseMap]) => r)),
                        (a): [Finalizer, A] => [(e) => release(k.value, e)(s.releaseMap), a]
                     );
                  }
               }
            }),
            T.map((s) => s.finalizerAndA)
         )
      )
   );

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => <R, E>(self: Managed<R, E, A>) => map_(self, f);

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map_ = <R, E, A, B>(self: Managed<R, E, A>, f: (a: A) => B) =>
   managed<R, E, B>(T.map_(self.effect, ([fin, a]) => [fin, f(a)]));

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapEffect_ = <R, E, A, R1, E1, B>(self: Managed<R, E, A>, f: (a: A) => T.Effect<R1, E1, B>) =>
   managed<R & R1, E | E1, B>(
      T.chain_(self.effect, ([fin, a]) =>
         T.local_(
            T.map_(f(a), (b) => [fin, b]),
            ([r]: readonly [R & R1, ReleaseMap]) => r
         )
      )
   );

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapEffect = <R1, E1, A, B>(f: (a: A) => T.Effect<R1, E1, B>) => <R, E>(self: Managed<R, E, A>) =>
   managed<R & R1, E | E1, B>(
      T.chain_(self.effect, ([fin, a]) =>
         T.local_(
            T.map_(f(a), (b) => [fin, b]),
            ([r]: readonly [R & R1, ReleaseMap]) => r
         )
      )
   );

/**
 * Like provideSome_ for effect but for Managed
 */
export const provideSome_ = <R, E, A, R0>(self: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> =>
   managed(T.asksM(([r0, rm]: readonly [R0, ReleaseMap]) => T.giveAll_(self.effect, [f(r0), rm])));

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 */
export class Reservation<R, E, A> {
   static of = <R, E, A, X2, R2>(
      acquire: T.Effect<R, E, A>,
      release: (exit: Exit<any, any>) => T.Effect<R2, never, any>
   ) => new Reservation<R & R2, E, A>(acquire, release);

   private constructor(
      readonly acquire: T.Effect<R, E, A>,
      readonly release: (exit: Exit<any, any>) => T.Effect<R, never, any>
   ) {}
}

/**
 * Make a new reservation
 */
export const makeReservation_ = <R, E, A, X2, R2>(
   acquire: T.Effect<R, E, A>,
   release: (exit: Exit<any, any>) => T.Effect<R2, never, any>
) => Reservation.of(acquire, release);

/**
 * Make a new reservation
 */
export const makeReservation = <R2>(release: (exit: Exit<any, any>) => T.Effect<R2, never, any>) => <R, E, A>(
   acquire: T.Effect<R, E, A>
) => Reservation.of(acquire, release);

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export const reserve = <R, E, A>(reservation: Reservation<R, E, A>) => makeReserve(T.pure(reservation));

/**
 * Lift a pure value into an effect
 */
export const succeed = <A>(a: A) => fromEffect(T.pure(a));

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap = <R1, E1, A>(f: (a: A) => Managed<R1, E1, any>) => <R, E>(self: Managed<R, E, A>) =>
   chain_(self, (a) => map_(f(a), () => a));

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap_ = <R, E, A, Q, D>(ma: Managed<R, E, A>, f: (a: A) => Managed<Q, D, any>): Managed<R & Q, E | D, A> =>
   tap(f)(ma);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const both_ = <R, E, A, R1, E1, A1>(self: Managed<R, E, A>, that: Managed<R1, E1, A1>) =>
   mapBoth_(self, that, (a, a2) => [a, a2] as [A, A1]);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const both = <R1, E1, A1>(that: Managed<R1, E1, A1>) => <R, E, A>(self: Managed<R, E, A>) =>
   mapBoth_(self, that, (a, a2) => [a, a2] as [A, A1]);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth = <A, B, R1, E1, A1>(that: Managed<R1, E1, A1>, f: (a: A, a2: A1) => B) => <R, E>(
   self: Managed<R, E, A>
) => mapBoth_(self, that, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth_ = <R, E, A, R1, E1, A1, B>(
   self: Managed<R, E, A>,
   that: Managed<R1, E1, A1>,
   f: (a: A, a2: A1) => B
) => chain_(self, (a) => map_(that, (a2) => f(a, a2)));

export const of = succeed({});

export const bindS: TC.BindSFn<[URI], V> = (name, f) =>
   chain((a) =>
      pipe(
         f(a),
         map((b) => bind_(a, name, b))
      )
   );

export const bindTo: TC.BindToSFn<[URI], V> = (name) => (fa) => map_(fa, bindTo_(name));

export const letS: TC.LetSFn<[URI], V> = (name, f) => bindS(name, flow(f, succeed));
