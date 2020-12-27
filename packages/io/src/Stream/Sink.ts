import type { Cause } from "../Cause";
import type { Chunk } from "../Chunk";
import type { HasClock } from "../Clock";

import * as E from "@principia/base/data/Either";
import { flow, identity, pipe, tuple } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as Tu from "@principia/base/data/Tuple";
import { matchTag } from "@principia/base/util/matchers";

import * as Ca from "../Cause";
import * as C from "../Chunk";
import { currentTime } from "../Clock";
import * as Ex from "../Exit";
import * as F from "../Fiber";
import * as I from "../IO";
import * as Ref from "../IORef";
import * as L from "../Layer";
import * as M from "../Managed";
import * as Sy from "../Sync";
import { Sink } from "./internal/Sink";
import { Transducer } from "./internal/Transducer";
import * as Push from "./Push";

export { Sink };

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a sink from a Push
 */
export function fromPush<R, E, I, L, Z>(push: Push.Push<R, E, I, L, Z>): Sink<R, E, I, L, Z> {
  return new Sink(M.succeed(push));
}

/**
 * Creates a Sink from a managed `Push`
 */
export function fromManagedPush<R, E, I, L, Z>(
  push: M.Managed<R, never, Push.Push<R, E, I, L, Z>>
): Sink<R, E, I, L, Z> {
  return new Sink(push);
}

/**
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, I, Z>(io: I.IO<R, E, Z>): Sink<R, E, I, I, Z> {
  return fromPush<R, E, I, I, Z>((in_) => {
    const leftover = O.fold_(in_, () => C.empty(), identity);
    return I.fold_(
      io,
      (e) => Push.fail(e, leftover),
      (z) => Push.emit(z, leftover)
    );
  });
}

/**
 * A sink that immediately ends with the specified value.
 */
export function succeed<Z, I>(z: Z): Sink<unknown, never, I, I, Z> {
  return fromPush<unknown, never, I, I, Z>((c) => {
    const leftover = O.fold_(c, () => C.empty<I>(), identity);
    return Push.emit(z, leftover);
  });
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E) {
  return <I>(): Sink<unknown, E, I, I, void> =>
    fromPush((c) => {
      const leftover = O.fold_(c, () => C.empty<I>(), identity);
      return Push.fail(e, leftover);
    });
}

/**
 * Creates a sink halting with a specified cause.
 */
export function halt<E>(cause: Cause<E>): Sink<unknown, E, unknown, never, never> {
  return fromPush((_) => Push.halt(cause));
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function fromForeach<I, R1, E1>(f: (i: I) => I.IO<R1, E1, any>): Sink<R1, E1, I, I, void> {
  const go = (
    chunk: Chunk<I>,
    idx: number,
    len: number
  ): I.IO<R1, [E.Either<E1, never>, Chunk<I>], void> => {
    if (idx === len) {
      return Push.more;
    } else {
      return pipe(
        f(chunk[idx]),
        I.foldM(
          (e) => Push.fail(e, C.drop_(chunk, idx + 1)),
          () => go(chunk, idx + 1, len)
        )
      );
    }
  };

  return fromPush(
    O.fold(
      () => Push.emit<never, void>(undefined, C.empty()),
      (is: Chunk<I>) => go(is, 0, is.length)
    )
  );
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function fromForeachChunk<R, E, I>(
  f: (chunk: Chunk<I>) => I.IO<R, E, any>
): Sink<R, E, I, never, void> {
  return fromPush(
    O.fold(
      () => Push.emit(undefined, C.empty()),
      (is) =>
        I.apSecond_(
          I.mapError_(f(is), (e) => [E.left(e), C.empty()]),
          Push.more
        )
    )
  );
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function foreachWhile<R, E, I>(f: (i: I) => I.IO<R, E, boolean>): Sink<R, E, I, I, void> {
  const go = (
    chunk: C.Chunk<I>,
    idx: number,
    len: number
  ): I.IO<R, readonly [E.Either<E, void>, C.Chunk<I>], void> => {
    if (idx === len) {
      return Push.more;
    } else {
      return I.foldM_(
        f(chunk[idx]),
        (e) => Push.fail(e, C.drop_(chunk, idx + 1)),
        (b) => {
          if (b) {
            return go(chunk, idx + 1, len);
          } else {
            return Push.emit<I, void>(undefined, C.drop_(chunk, idx));
          }
        }
      );
    }
  };

  return fromPush((in_: O.Option<C.Chunk<I>>) =>
    O.fold_(
      in_,
      () => Push.emit<never, void>(undefined, C.empty()),
      (is) => go(is, 0, is.length)
    )
  );
}

/**
 * A sink that ignores its inputs.
 */
export const drain: Sink<unknown, never, unknown, never, void> = dropLeftover(
  fromForeach((_) => I.unit())
);

/**
 * Creates a sink containing the first value.
 */
export function head<I>(): Sink<unknown, never, I, I, O.Option<I>> {
  return new Sink(
    M.succeed(
      O.fold(
        () => Push.emit(O.none(), C.empty()),
        (is) => (C.isEmpty(is) ? Push.more : Push.emit(C.head(is), C.drop_(is, 1)))
      )
    )
  );
}

export function last<I>(): Sink<unknown, never, I, never, O.Option<I>> {
  return new Sink(
    M.map_(M.fromEffect(Ref.make<O.Option<I>>(O.none())), (state) => (is: O.Option<Chunk<I>>) =>
      pipe(
        state.get,
        I.flatMap((last) =>
          O.fold_(
            is,
            () => Push.emit(last, C.empty<never>()),
            flow(
              C.last,
              O.fold(
                () => Push.more,
                (l) => I.apSecond_(state.set(O.some(l)), Push.more)
              )
            )
          )
        )
      )
    )
  );
}

/**
 * A sink that takes the specified number of values.
 */
export function take<I>(n: number): Sink<unknown, never, I, I, Chunk<I>> {
  return new Sink(
    M.map_(M.fromEffect(Ref.make<Chunk<I>>(C.empty())), (state) => (is: O.Option<Chunk<I>>) =>
      pipe(
        state.get,
        I.flatMap((take) =>
          O.fold_(
            is,
            () => (n >= 0 ? Push.emit(take, C.empty<I>()) : Push.emit(C.empty<I>(), take)),
            (ch) => {
              const remaining = n - take.length;
              if (remaining <= ch.length) {
                const [chunk, leftover] = C.splitAt_(ch, remaining);
                return I.apSecond_(
                  state.set(C.empty()),
                  Push.emit(C.concat_(take, chunk), leftover)
                );
              } else {
                return I.apSecond_(state.set(C.concat_(take, ch)), Push.more);
              }
            }
          )
        )
      )
    )
  );
}

export function reduceChunksM_<R, E, I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: Chunk<I>) => I.IO<R, E, Z>
): Sink<R, E, I, I, Z> {
  return cont(z)
    ? new Sink(
        M.map_(M.fromEffect(Ref.make(z)), (state) => (is: O.Option<Chunk<I>>) =>
          O.fold_(
            is,
            () => I.flatMap_(state.get, (s) => Push.emit(s, C.empty())),
            (is) =>
              pipe(
                state.get,
                I.flatMap((s) => f(s, is)),
                I.mapError((e) => Tu.tuple_(E.left(e), C.empty<I>())),
                I.flatMap((s) =>
                  cont(s) ? I.apSecond_(state.set(s), Push.more) : Push.emit(s, C.empty<I>())
                )
              )
          )
        )
      )
    : succeed(z);
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function reduceChunksM<R, E, I, Z>(
  z: Z,
  f: (z: Z, i: Chunk<I>) => I.IO<R, E, Z>
): Sink<R, E, I, never, Z> {
  return dropLeftover(reduceChunksM_(z, (_) => true, f));
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function reduceChunksWhile<I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: Chunk<I>) => Z
): Sink<unknown, never, I, I, Z> {
  return reduceChunksM_(z, cont, (z, i) => I.succeed(f(z, i)));
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function reduceChunks<I, Z>(
  z: Z,
  f: (z: Z, i: Chunk<I>) => Z
): Sink<unknown, never, I, never, Z> {
  return dropLeftover(reduceChunksWhile(z, () => true, f));
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 *
 * This sink may terminate in the middle of a chunk and discard the rest of it. See the discussion on the
 * ZSink class scaladoc on sinks vs. transducers.
 */
export function reduceWhileM<R, E, I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: I) => I.IO<R, E, Z>
): Sink<R, E, I, I, Z> {
  const foldChunk = (
    z: Z,
    chunk: Chunk<I>,
    i: number,
    len: number
  ): I.IO<R, readonly [E, Chunk<I>], readonly [Z, O.Option<Chunk<I>>]> => {
    if (i === len) {
      return I.succeed([z, O.none()]);
    } else {
      return I.foldM_(
        f(z, chunk[i]),
        (e) => I.fail([e, C.drop_(chunk, i + 1)]),
        (s) =>
          cont(s) ? foldChunk(s, chunk, i + 1, len) : I.succeed([s, O.some(C.drop_(chunk, i + 1))])
      );
    }
  };

  if (cont(z)) {
    return new Sink(
      M.map_(M.fromEffect(Ref.make(z)), (state) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () => I.flatMap_(state.get, (s) => Push.emit(s, C.empty())),
          (is) =>
            I.flatMap_(state.get, (z) =>
              I.foldM_(
                foldChunk(z, is, 0, is.length),
                (err) => Push.fail(Tu.fst(err), Tu.snd(err)),
                ([st, l]) =>
                  O.fold_(
                    l,
                    () => I.apSecond_(state.set(st), Push.more),
                    (leftover) => Push.emit(st, leftover)
                  )
              )
            )
        )
      )
    );
  } else {
    return succeed(z);
  }
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduceWhile<I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: I) => Z
): Sink<unknown, never, I, I, Z> {
  const foldChunk = (
    z: Z,
    chunk: Chunk<I>,
    i: number,
    len: number
  ): Sy.USync<readonly [Z, O.Option<Chunk<I>>]> =>
    Sy.gen(function* (_) {
      if (i === len) {
        return [z, O.none()];
      } else {
        const z1 = f(z, chunk[i]);
        return cont(z1)
          ? yield* _(foldChunk(z1, chunk, i + 1, len))
          : [z1, O.some(C.drop_(chunk, i + 1))];
      }
    });

  if (cont(z)) {
    return new Sink(
      M.map_(M.fromEffect(Ref.make(z)), (state) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () => I.flatMap_(state.get, (s) => Push.emit(s, C.empty())),
          (is) =>
            I.flatMap_(state.get, (z) =>
              I.flatMap_(foldChunk(z, is, 0, is.length), ([st, l]) =>
                O.fold_(
                  l,
                  () => I.apSecond_(state.set(st), Push.more),
                  (leftover) => Push.emit(st, leftover)
                )
              )
            )
        )
      )
    );
  } else {
    return succeed(z);
  }
}

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function reduce<I, Z>(z: Z, f: (z: Z, i: I) => Z): Sink<unknown, never, I, never, Z> {
  return dropLeftover(reduceWhile(z, (_) => true, f));
}

/**
 * A sink that collects all of its inputs into an array.
 */
export function collectAll<A>(): Sink<unknown, never, A, never, Chunk<A>> {
  return reduceChunks(C.empty(), (s, i) => C.concat_(s, i));
}

/**
 * A sink that collects all of its inputs into a map. The keys are extracted from inputs
 * using the keying function `key`; if multiple inputs use the same key, they are merged
 * using the `f` function.
 */
export function collectAllToMap<A, K>(key: (a: A) => K) {
  return (f: (a: A, a1: A) => A): Sink<unknown, never, A, never, ReadonlyMap<K, A>> =>
    new Sink(
      M.suspend(
        () =>
          reduceChunks(new Map<K, A>(), (acc, as: Chunk<A>) =>
            C.foldLeft_(as, acc, (acc, a) => {
              const k = key(a);
              const v = acc.get(k);

              return acc.set(k, v ? f(v, a) : a);
            })
          ).push
      )
    );
}

/**
 * A sink that collects all of its inputs into a set.
 */
export function collectAllToSet<A>(): Sink<unknown, never, A, never, Set<A>> {
  return map_(collectAll<A>(), (as) => new Set(as));
}

/**
 * A sink that counts the number of elements fed to it.
 */
export const count: Sink<unknown, never, unknown, never, number> = reduce(0, (s, _) => s + 1);

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 */
export function dieMessage(m: string): Sink<unknown, never, unknown, never, never> {
  return halt(Ca.die(new Ca.RuntimeError(m)));
}

/**
 * A sink that sums incoming numeric values.
 */
export const sum: Sink<unknown, never, number, never, number> = reduce(0, (a, b) => a + b);

/**
 * A sink with timed execution.
 */
export const timedDrain: Sink<HasClock, never, unknown, never, number> = map_(
  timed(drain),
  ([_, a]) => a
);

/*
 * -------------------------------------------
 * Apply Seq
 * -------------------------------------------
 */

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1, Z2>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, E | E1, I & I1, L | L1, Z2> {
  return chain_(fa, (z) => map_(fb, (_) => f(z, _)));
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith<R1, E1, I, I1 extends I, L1, Z, Z1, Z2>(
  fb: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E, L extends I1>(fa: Sink<R, E, I, L, Z>) => zipWith_(fa, fb, f);
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return zipWith_(fa, fb, tuple);
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(
  fa: Sink<R, E, I, L, Z>
) => Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return (fa) => zip_(fa, fb);
}

export function apFirst_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return zipWith_(fa, fb, (z, _) => z);
}

export function apFirst<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return zipWith_(fa, fb, (_, z1) => z1);
}

export function apSecond<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return (fa) => apSecond_(fa, fb);
}

/*
 * -------------------------------------------
 * Apply Par
 * -------------------------------------------
 */

class BothRunning {
  readonly _tag = "BothRunning";
}

const bothRunning = new BothRunning();

class LeftDone<Z> {
  readonly _tag = "LeftDone";
  constructor(readonly value: Z) {}
}

class RightDone<Z1> {
  readonly _tag = "RightDone";
  constructor(readonly value: Z1) {}
}

type State<Z, Z1> = BothRunning | LeftDone<Z> | RightDone<Z1>;

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar_<R, R1, E, E1, I, I1, L, L1, Z, Z1, Z2>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, E | E1, I & I1, L | L1, Z2> {
  return new Sink(
    pipe(
      M.do,
      M.bindS("ref", () => I.toManaged_(Ref.make<State<Z, Z1>>(bothRunning))),
      M.bindS("p1", () => self.push),
      M.bindS("p2", () => that.push),
      M.map(({ p1, p2, ref }) => {
        return (in_: O.Option<C.Chunk<I & I1>>) =>
          I.flatMap_(ref.get, (state) => {
            const newState = pipe(
              state,
              matchTag({
                BothRunning: (): I.IO<
                  R & R1,
                  readonly [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                  State<Z, Z1>
                > => {
                  const l: I.IO<
                    R & R1,
                    readonly [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                    O.Option<readonly [Z, C.Chunk<L>]>
                  > = I.foldM_(
                    p1(in_),
                    ([e, l]) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as I.IO<
                            R & R1,
                            [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                            O.Option<readonly [Z, C.Chunk<L>]>
                          >,
                        (z) =>
                          I.succeed(O.some([z, l] as const)) as I.IO<
                            R & R1,
                            [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                            O.Option<readonly [Z, C.Chunk<L>]>
                          >
                      ),
                    (_) =>
                      I.succeed(O.none()) as I.IO<
                        R & R1,
                        [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                        O.Option<readonly [Z, C.Chunk<L>]>
                      >
                  );
                  const r: I.IO<
                    R & R1,
                    readonly [E.Either<E | E1, never>, C.Chunk<L | L1>],
                    O.Option<readonly [Z1, C.Chunk<L1>]>
                  > = I.foldM_(
                    p2(in_),
                    ([e, l]) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as I.IO<
                            R & R1,
                            [E.Either<E | E1, never>, C.Chunk<L | L1>],
                            O.Option<readonly [Z1, C.Chunk<L1>]>
                          >,
                        (z) =>
                          I.succeed(O.some([z, l] as const)) as I.IO<
                            R & R1,
                            [E.Either<E | E1, never>, C.Chunk<L | L1>],
                            O.Option<readonly [Z1, C.Chunk<L1>]>
                          >
                      ),
                    (_) =>
                      I.succeed(O.none()) as I.IO<
                        R & R1,
                        [E.Either<E | E1, never>, C.Chunk<L | L1>],
                        O.Option<readonly [Z1, C.Chunk<L1>]>
                      >
                  );

                  return I.flatMap_(
                    I.productPar_(l, r),
                    ([lr, rr]): I.IO<
                      R & R1,
                      readonly [E.Either<E1, Z2>, C.Chunk<L | L1>],
                      State<Z, Z1>
                    > => {
                      if (O.isSome(lr)) {
                        const [z, l] = lr.value;

                        if (O.isSome(rr)) {
                          const [z1, l1] = rr.value;

                          return I.fail([
                            E.right(f(z, z1)),
                            l.length > l1.length ? l1 : l
                          ] as const);
                        } else {
                          return I.succeed(new LeftDone(z));
                        }
                      } else {
                        if (O.isSome(rr)) {
                          const [z1] = rr.value;

                          return I.succeed(new RightDone(z1));
                        } else {
                          return I.succeed(bothRunning);
                        }
                      }
                    }
                  ) as I.IO<R & R1, readonly [E.Either<E1, Z2>, C.Chunk<L | L1>], State<Z, Z1>>;
                },
                LeftDone: ({ value: z }) =>
                  I.as_(
                    I.catchAll_(
                      p2(in_),
                      ([e, leftover]): I.IO<
                        R & R1,
                        readonly [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                        State<Z, Z1>
                      > =>
                        E.fold_(
                          e,
                          (e) => Push.fail(e, leftover),
                          (z1) => Push.emit(f(z, z1), leftover)
                        )
                    ),
                    () => state
                  ),
                RightDone: ({ value: z1 }) =>
                  I.as_(
                    I.catchAll_(
                      p1(in_),
                      ([e, leftover]): I.IO<
                        R & R1,
                        readonly [E.Either<E | E1, Z2>, C.Chunk<L | L1>],
                        State<Z, Z1>
                      > =>
                        E.fold_(
                          e,
                          (e) => Push.fail(e, leftover),
                          (z) => Push.emit(f(z, z1), leftover)
                        )
                    ),
                    () => state
                  )
              })
            );

            return I.flatMap_(newState, (ns) => (ns === state ? I.unit() : ref.set(ns)));
          });
      })
    )
  );
}

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar<R1, E1, I1, L1, Z, Z1, Z2>(
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => zipWithPar_(self, that, f);
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return zipWithPar_(fa, fb, tuple);
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(
  fa: Sink<R, E, I, L, Z>
) => Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return (fa) => zipPar_(fa, fb);
}

export function apFirstPar_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return zipWithPar_(fa, fb, (z, _) => z);
}

export function apFirstPar<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return (fa) => apFirstPar_(fa, fb);
}

export function apSecondPar_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return zipWithPar_(fa, fb, (_, z1) => z1);
}

export function apSecondPar<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return (fa) => apSecondPar_(fa, fb);
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, E, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I
): Sink<R, E, I2, L, Z> {
  return contramapChunks_(fa, C.map(f));
}

/**
 * Transforms this sink's input elements.
 */
export function contramap<I, I2>(f: (i2: I2) => I) {
  return <R, E, L, Z>(fa: Sink<R, E, I, L, Z>) => contramap_(fa, f);
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM_<R, R1, E, E1, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I.IO<R1, E1, I>
): Sink<R & R1, E | E1, I2, L, Z> {
  return contramapChunksM_(fa, I.foreach(f));
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM<R1, E1, I, I2>(f: (i2: I2) => I.IO<R1, E1, I>) {
  return <R, E, L, Z>(fa: Sink<R, E, I, L, Z>) => contramapM_(fa, f);
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, E, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (a: C.Chunk<I2>) => C.Chunk<I>
): Sink<R, E, I2, L, Z> {
  return new Sink(M.map_(fa.push, (push) => (input) => push(O.map_(input, f))));
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<I, I2>(f: (a: C.Chunk<I2>) => C.Chunk<I>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunks_(self, f);
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM_<R, R1, E, E1, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (a: C.Chunk<I2>) => I.IO<R1, E1, C.Chunk<I>>
): Sink<R & R1, E | E1, I2, L, Z> {
  return new Sink(
    M.map_(fa.push, (push) => {
      return (input: O.Option<C.Chunk<I2>>) =>
        O.fold_(
          input,
          () => push(O.none()),
          (value) =>
            pipe(
              f(value),
              I.mapError((e: E | E1) => [E.left(e), C.empty<L>()] as const),
              I.flatMap((is) => push(O.some(is)))
            )
        );
    })
  );
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM<R1, E1, I, I2>(f: (a: C.Chunk<I2>) => I.IO<R1, E1, C.Chunk<I>>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunksM_(self, f);
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap_<R, E, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramap_(fa, f), g);
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap<I, I2, Z, Z2>(f: (i2: I2) => I, g: (z: Z) => Z2) {
  return <R, E, L>(fa: Sink<R, E, I, L, Z>) => dimap_(fa, f, g);
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapM_<R, R1, E, E1, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I.IO<R1, E1, I>,
  g: (z: Z) => I.IO<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapM_(fa, f), g);
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapM<R1, E1, I, I2, Z, Z2>(
  f: (i2: I2) => I.IO<R1, E1, I>,
  g: (z: Z) => I.IO<R1, E1, Z2>
) {
  return <R, E, L>(self: Sink<R, E, I, L, Z>) => dimapM_(self, f, g);
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks_<R, E, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: C.Chunk<I2>) => C.Chunk<I>,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramapChunks_(fa, f), g);
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks<I, I2, Z, Z2>(f: (i2: C.Chunk<I2>) => C.Chunk<I>, g: (z: Z) => Z2) {
  return <R, E, L>(fa: Sink<R, E, I, L, Z>) => dimapChunks_(fa, f, g);
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM_<R, R1, E, E1, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: C.Chunk<I2>) => I.IO<R1, E1, C.Chunk<I>>,
  g: (z: Z) => I.IO<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapChunksM_(fa, f), g);
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM<R1, E1, I, I2, Z, Z2>(
  f: (i2: C.Chunk<I2>) => I.IO<R1, E1, C.Chunk<I>>,
  g: (z: Z) => I.IO<R1, E1, Z2>
) {
  return <R, E, L>(fa: Sink<R, E, I, L, Z>) => dimapChunksM_(fa, f, g);
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

export function foldM_<R, E, I, L, Z, R1, E1, I1, L1, Z1, R2, E2, I2, L2, Z2>(
  sz: Sink<R, E, I, L, Z>,
  onFailure: (e: E) => Sink<R1, E1, I1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, E2, I2, L2, Z2>
): Sink<R & R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2> {
  return new Sink(
    pipe(
      M.do,
      M.bindS("switched", () => M.fromEffect(Ref.make(false))),
      M.bindS("thisPush", () => sz.push),
      M.bindS("thatPush", () =>
        M.fromEffect(
          Ref.make<Push.Push<R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2>>((_) => I.unit())
        )
      ),
      M.bindS("openThatPush", () =>
        M.switchable<R1 & R2, never, Push.Push<R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2>>()
      ),
      M.map(
        ({ openThatPush, switched, thisPush, thatPush }) => (in_: O.Option<Chunk<I & I1 & I2>>) =>
          I.flatMap_(switched.get, (sw) => {
            if (!sw) {
              return I.catchAll_(thisPush(in_), (v) => {
                const leftover = v[1];
                const nextSink = E.fold_(v[0], onFailure, onSuccess);
                return pipe(
                  openThatPush(nextSink.push),
                  I.tap(thatPush.set),
                  I.flatMap((p) =>
                    pipe(
                      switched.set(true),
                      I.apSecond(
                        O.fold_(
                          in_,
                          () =>
                            pipe(
                              p(O.some(leftover) as O.Option<Chunk<I & I1 & I2>>),
                              I.when(() => leftover.length > 0),
                              I.apSecond(p(O.none()))
                            ),
                          () =>
                            pipe(
                              p(O.some(leftover) as O.Option<Chunk<I & I1 & I2>>),
                              I.when(() => leftover.length > 0)
                            )
                        )
                      )
                    )
                  )
                );
              });
            } else {
              return I.flatMap_(thatPush.get, (p) => p(in_));
            }
          })
      )
    )
  );
}

export function foldM<E, I, Z, R1, E1, I1, L1, Z1, R2, E2, I2, L2, Z2>(
  onFailure: (e: E) => Sink<R1, E1, I1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, E2, I2, L2, Z2>
): <R, L>(sz: Sink<R, E, I, L, Z>) => Sink<R & R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2> {
  return (sz) => foldM_(sz, onFailure, onSuccess);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Transforms this sink's result.
 */
export function map_<R, E, I, L, Z, Z2>(
  sz: Sink<R, E, I, L, Z>,
  f: (z: Z) => Z2
): Sink<R, E, I, L, Z2> {
  return new Sink(
    M.map_(sz.push, (sink) => (inputs: O.Option<Chunk<I>>) =>
      I.mapError_(sink(inputs), (e) => [E.map_(e[0], f), e[1]])
    )
  );
}

/**
 * Transforms this sink's result.
 */
export function map<Z, Z2>(
  f: (z: Z) => Z2
): <R, E, I, L>(sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, Z2> {
  return (sz) => map_(sz, f);
}
/**
 * Effectfully transforms this sink's result.
 */
export function mapM_<R, R1, E, E1, I, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => I.IO<R1, E1, Z2>
): Sink<R & R1, E | E1, I, L, Z2> {
  return new Sink(
    M.map_(self.push, (push) => {
      return (inputs: O.Option<Chunk<I>>) =>
        I.catchAll_(push(inputs), ([e, left]) =>
          E.fold_(
            e,
            (e) => Push.fail(e, left),
            (z) =>
              I.foldM_(
                f(z),
                (e: E | E1) => Push.fail(e, left),
                (z2) => Push.emit(z2, left)
              )
          )
        );
    })
  );
}

/**
 * Effectfully transforms this sink's result.
 */
export function mapM<R1, E1, Z, Z2>(f: (z: Z) => I.IO<R1, E1, Z2>) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => mapM_(self, f);
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return foldM_(
    self,
    (e) => (fail(e)<I1>() as unknown) as Sink<R & R1, E | E1, I & I1, L | L1, Z1>,
    f
  );
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain<Z, R, R1, E1, I, I1 extends I, L1, Z1>(
  f: (z: Z) => Sink<R1, E1, I1, L1, Z1>
) {
  return <E, L extends I1>(self: Sink<R, E, I, L, Z>) => chain_(self, f);
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  r: R
): Sink<unknown, E, I, L, Z> {
  return new Sink(
    M.map_(M.giveAll_(self.push, r), (push) => (i: O.Option<C.Chunk<I>>) => I.giveAll_(push(i), r))
  );
}

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(r: R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => giveAll_(self, r);
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives_<R0, R, E, I, L, Z>(self: Sink<R, E, I, L, Z>, f: (r0: R0) => R) {
  return new Sink(
    M.map_(M.gives_(self.push, f), (push) => (i: O.Option<C.Chunk<I>>) => I.gives_(push(i), f))
  );
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives<R0, R>(f: (r0: R0) => R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => gives_(self, f);
}

/**
 * Accesses the environment of the sink in the context of a sink.
 */
export function accessM<R, R1, E, I, L, Z>(
  f: (r: R) => Sink<R1, E, I, L, Z>
): Sink<R & R1, E, I, L, Z> {
  return new Sink(M.chain_(M.ask<R>(), (env) => f(env).push));
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function giveLayer<R2, R>(layer: L.Layer<R2, never, R>) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => giveLayer_(self, layer);
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function giveLayer_<R, E, I, L, Z, R2>(
  self: Sink<R, E, I, L, Z>,
  layer: L.Layer<R2, never, R>
) {
  return new Sink<R2, E, I, L, Z>(
    M.chain_(L.build(layer), (r) =>
      M.map_(M.giveAll_(self.push, r), (push) => (i: O.Option<C.Chunk<I>>) =>
        I.giveAll_(push(i), r)
      )
    )
  );
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function givesLayer<R2, R>(layer: L.Layer<R2, never, R>) {
  return <R0, E, I, L, Z>(self: Sink<R & R0, E, I, L, Z>): Sink<R0 & R2, E, I, L, Z> =>
    giveLayer(layer["+++"](L.identity<R0>()))(self);
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function givesLayer_<R0, E, I, L, Z, R2, R>(
  self: Sink<R & R0, E, I, L, Z>,
  layer: L.Layer<R2, never, R>
): Sink<R0 & R2, E, I, L, Z> {
  return givesLayer(layer)(self);
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Replaces this sink's result with the provided value.
 */
export function as_<R, E, I, L, Z, Z1>(sz: Sink<R, E, I, L, Z>, z1: Z1): Sink<R, E, I, L, Z1> {
  return map_(sz, () => z1);
}

/**
 * Replaces this sink's result with the provided value.
 */
export function as<Z1>(z1: Z1): <R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, Z1> {
  return (sz) => as_(sz, z1);
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith_<R, E, I, L, Z, S>(
  sz: Sink<R, E, I, L, Z>,
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): Sink<R, E, I, L, S> {
  return new Sink(
    pipe(
      Ref.makeManaged(z),
      M.chain((acc) => {
        return pipe(
          Push.restartable(sz.push),
          M.map(([push, restart]) => {
            const go = (
              s: S,
              in_: O.Option<Chunk<I>>,
              end: boolean
            ): I.IO<R, [E.Either<E, S>, Chunk<L>], S> =>
              I.catchAll_(
                I.as_(push(in_), () => s),
                ([e, leftover]) =>
                  E.fold_(
                    e,
                    (e) => Push.fail(e, leftover),
                    (z) => {
                      if (p(z)) {
                        const s1 = f(s, z);

                        if (leftover.length === 0) {
                          if (end) {
                            return Push.emit(s1, C.empty());
                          } else {
                            return I.as_(restart, () => s1);
                          }
                        } else {
                          return I.apSecond_(
                            restart,
                            go(s1, O.some((leftover as unknown) as Chunk<I>), end)
                          );
                        }
                      } else {
                        return Push.emit(s, leftover);
                      }
                    }
                  )
              );

            return (in_: O.Option<Chunk<I>>) =>
              I.flatMap_(acc.get, (s) =>
                I.flatMap_(go(s, in_, O.isNone(in_)), (s1) => acc.set(s1))
              );
          })
        );
      })
    )
  );
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith<R, E, I, L, Z, S>(
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): (sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, S> {
  return (sz) => collectAllWhileWith_(sz, z, p, f);
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function raceBoth_<R, E, I, L, Z, R1, E1, I1, L1, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R1 & R, E1 | E, I & I1, L1 | L, E.Either<Z, Z1>> {
  return new Sink(
    pipe(
      M.do,
      M.bindS("p1", () => self.push),
      M.bindS("p2", () => that.push),
      M.map(({ p1, p2 }) => (i: O.Option<Chunk<I & I1>>): I.IO<
        R1 & R,
        readonly [E.Either<E | E1, E.Either<Z, Z1>>, Chunk<L | L1>],
        void
      > =>
        I.raceWith_(
          p1(i),
          p2(i),
          (res1, fib2) =>
            Ex.foldM_(
              res1,
              (f) =>
                I.apSecond_(
                  F.interrupt(fib2),
                  I.halt(
                    pipe(
                      f,
                      Ca.map(([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                    )
                  )
                ),
              () =>
                I.mapError_(
                  F.join(fib2),
                  ([r, leftover]) => [E.map_(r, E.right), leftover] as const
                )
            ),
          (res2, fib1) =>
            Ex.foldM_(
              res2,
              (f) =>
                I.apSecond_(
                  F.interrupt(fib1),
                  I.halt(
                    pipe(
                      f,
                      Ca.map(([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                    )
                  )
                ),
              () =>
                I.mapError_(F.join(fib1), ([r, leftover]) => [E.map_(r, E.left), leftover] as const)
            )
        )
      )
    )
  );
}

export function dropLeftover<R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>): Sink<R, E, I, never, Z> {
  return new Sink(
    M.map_(sz.push, (p) => (in_: O.Option<Chunk<I>>) =>
      I.mapError_(p(in_), ([v, _]) => [v, C.empty()])
    )
  );
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the error from the
 * one that finishes first.
 */
export function race_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z | Z1> {
  return map_(raceBoth_(self, that), E.merge);
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the error from the
 * one that finishes first.
 */
export function race<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => race_(self, that);
}

/**
 * Returns the sink that executes this one and times its execution.
 */
export function timed<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>
): Sink<R & HasClock, E, I, L, readonly [Z, number]> {
  return new Sink(
    pipe(
      self.push,
      M.map2(I.toManaged_(currentTime), (push, start) => {
        return (in_: O.Option<Chunk<I>>) =>
          I.catchAll_(
            push(in_),
            ([e, leftover]): I.IO<
              R & HasClock,
              [E.Either<E, readonly [Z, number]>, Chunk<L>],
              never
            > =>
              E.fold_(
                e,
                (e) => Push.fail(e, leftover),
                (z) =>
                  I.flatMap_(currentTime, (stop) => Push.emit([z, stop - start] as const, leftover))
              )
          );
      })
    )
  );
}

/**
 * Converts this sink to a transducer that feeds incoming elements to the sink
 * and emits the sink's results as outputs. The sink will be restarted when
 * it ends.
 */
export function toTransducer<R, E, I, L extends I, Z>(
  self: Sink<R, E, I, L, Z>
): Transducer<R, E, I, Z> {
  return new Transducer(
    M.map_(Push.restartable(self.push), ([push, restart]) => {
      const go = (input: O.Option<Chunk<I>>): I.IO<R, E, Chunk<Z>> =>
        I.foldM_(
          push(input),
          ([e, leftover]) =>
            E.fold_(
              e,
              (e) => I.fail(e),
              (z) =>
                I.andThen_(
                  restart,
                  C.isEmpty(leftover) || O.isNone(input)
                    ? I.succeed([z])
                    : I.map_(go(O.some(leftover)), (more) => [z, ...more])
                )
            ),
          (_) => I.succeed(C.empty())
        );

      return (input: O.Option<Chunk<I>>) => go(input);
    })
  );
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM_<R, R1, E, E1, I, L extends I, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => I.IO<R1, E1, boolean>
): Sink<R & R1, E | E1, I, L, O.Option<Z>> {
  return new Sink(
    M.map_(Push.restartable(self.push), ([push, restart]) => {
      const go = (
        in_: O.Option<Chunk<I>>,
        end: boolean
      ): I.IO<R & R1, readonly [E.Either<E | E1, O.Option<Z>>, Chunk<L>], void> => {
        return I.catchAll_(push(in_), ([e, leftover]) =>
          E.fold_(
            e,
            (e) => Push.fail(e, leftover),
            (z) =>
              I.flatMap_(
                I.mapError_(f(z), (err) => [E.left(err), leftover] as const),
                (satisfied) => {
                  if (satisfied) {
                    return Push.emit(O.some(z), leftover);
                  } else if (C.isEmpty(leftover)) {
                    return end ? Push.emit(O.none(), C.empty()) : I.andThen_(restart, Push.more);
                  } else {
                    return go(O.some(leftover) as O.Option<Chunk<I>>, end);
                  }
                }
              )
          )
        );
      };

      return (is: O.Option<Chunk<I>>) => go(is, O.isNone(is));
    })
  );
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM<R1, E1, Z>(f: (z: Z) => I.IO<R1, E1, boolean>) {
  return <R, E, I, L extends I>(self: Sink<R, E, I, L, Z>) => untilOutputM_(self, f);
}

/**
 * A sink that depends on another managed value
 * `resource` will be finalized after the processing.
 */
export function managed_<R, E, A, I, L extends I, Z>(
  resource: M.Managed<R, E, A>,
  fn: (a: A) => Sink<R, E, I, L, Z>
): Sink<R, E, I, I, Z> {
  return new Sink(
    M.chain_(
      M.fold_(
        resource,
        (err) => fail(err)<I>() as Sink<R, E, I, I, Z>,
        (m) => fn(m)
      ),
      (_) => _.push
    )
  );
}

/**
 * A sink that depends on another managed value
 * `resource` will be finalized after the processing.
 */
export function managed<R, E, A>(resource: M.Managed<R, E, A>) {
  return <I, L extends I, Z>(fn: (a: A) => Sink<R, E, I, L, Z>): Sink<R, E, I, I, Z> =>
    managed_(resource, fn);
}

/**
 * Exposes leftover
 */
export function exposeLeftover<R, E, I, L, Z>(
  ma: Sink<R, E, I, L, Z>
): Sink<R, E, I, never, readonly [Z, Chunk<L>]> {
  return new Sink(
    M.map_(ma.push, (push) => {
      return (in_: O.Option<Chunk<I>>) =>
        I.mapError_(push(in_), ([v, leftover]) => {
          return [E.map_(v, (z) => [z, leftover] as const), C.empty<never>()] as const;
        });
    })
  );
}