import { flow, identity } from "@principia/prelude";

import * as A from "../../../Array";
import * as E from "../../../Either";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import * as Sy from "../../../Sync";
import * as Tu from "../../../Tuple";
import type { Cause } from "../../Exit/Cause";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as Push from "../internal/Push";
import { Sink } from "./model";

/**
 * Creates a sink from a Push
 */
export function fromPush<R, E, I, L, Z>(push: Push.Push<R, E, I, L, Z>) {
  return new Sink(M.succeed(push));
}

/**
 * Creates a single-value sink produced from an effect
 */
export function fromTask<R, E, I, Z>(task: T.Task<R, E, Z>): Sink<R, E, I, I, Z> {
  return fromPush<R, E, I, I, Z>((in_) => {
    const leftover = O.fold_(in_, () => A.empty(), identity);
    return T.fold_(
      task,
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
    const leftover = O.fold_(c, () => A.empty<I>(), identity);
    return Push.emit(z, leftover);
  });
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E, I>(e: E): Sink<unknown, E, I, I, void> {
  return fromPush((c) => {
    const leftover = O.fold_(c, () => A.empty<I>(), identity);
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
export function fromForeach<I, R1, E1>(f: (i: I) => T.Task<R1, E1, any>): Sink<R1, E1, I, I, void> {
  const go = (
    chunk: ReadonlyArray<I>,
    idx: number,
    len: number
  ): T.Task<R1, [E.Either<E1, never>, ReadonlyArray<I>], void> => {
    if (idx === len) {
      return Push.more;
    } else {
      return pipe(
        f(chunk[idx]),
        T.foldM(
          (e) => Push.fail(e, A.drop_(chunk, idx + 1)),
          () => go(chunk, idx + 1, len)
        )
      );
    }
  };

  return fromPush(
    O.fold(
      () => Push.emit<never, void>(undefined, A.empty()),
      (is: ReadonlyArray<I>) => go(is, 0, is.length)
    )
  );
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function fromForeachChunk<R, E, I>(
  f: (chunk: ReadonlyArray<I>) => T.Task<R, E, any>
): Sink<R, E, I, never, void> {
  return fromPush(
    O.fold(
      () => Push.emit(undefined, A.empty()),
      (is) =>
        T.apSecond_(
          T.mapError_(f(is), (e) => [E.left(e), A.empty()]),
          Push.more
        )
    )
  );
}

const dropLeftover = <R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>): Sink<R, E, I, never, Z> =>
  new Sink(
    M.map_(sz.push, (p) => (in_: O.Option<ReadonlyArray<I>>) =>
      T.mapError_(p(in_), ([v, _]) => [v, A.empty()])
    )
  );

/**
 * A sink that ignores its inputs.
 */
export const drain: Sink<unknown, never, unknown, never, void> = dropLeftover(
  fromForeach((_) => T.unit())
);

/**
 * Creates a sink containing the first value.
 */
export function head<I>(): Sink<unknown, never, I, I, O.Option<I>> {
  return new Sink(
    M.succeed(
      O.fold(
        () => Push.emit(O.none(), A.empty()),
        (is) => (A.isEmpty(is) ? Push.more : Push.emit(A.head(is), A.drop_(is, 1)))
      )
    )
  );
}

export function last<I>(): Sink<unknown, never, I, never, O.Option<I>> {
  return new Sink(
    M.map_(
      M.fromTask(XR.make<O.Option<I>>(O.none())),
      (state) => (is: O.Option<ReadonlyArray<I>>) =>
        pipe(
          state.get,
          T.chain((last) =>
            O.fold_(
              is,
              () => Push.emit(last, A.empty<never>()),
              flow(
                A.last,
                O.fold(
                  () => Push.more,
                  (l) => T.apSecond_(state.set(O.some(l)), Push.more)
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
export function take<I>(n: number): Sink<unknown, never, I, I, ReadonlyArray<I>> {
  return new Sink(
    M.map_(
      M.fromTask(XR.make<ReadonlyArray<I>>(A.empty())),
      (state) => (is: O.Option<ReadonlyArray<I>>) =>
        pipe(
          state.get,
          T.chain((take) =>
            O.fold_(
              is,
              () => (n >= 0 ? Push.emit(take, A.empty<I>()) : Push.emit(A.empty<I>(), take)),
              (ch) => {
                const remaining = n - take.length;
                if (remaining <= ch.length) {
                  const [chunk, leftover] = A.splitAt(remaining)(ch);
                  return T.apSecond_(
                    state.set(A.empty()),
                    Push.emit(A.concat_(take, chunk), leftover)
                  );
                } else {
                  return T.apSecond_(state.set(A.concat_(take, ch)), Push.more);
                }
              }
            )
          )
        )
    )
  );
}

export function fromFoldChunksM_<R, E, I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: ReadonlyArray<I>) => T.Task<R, E, Z>
): Sink<R, E, I, I, Z> {
  return cont(z)
    ? new Sink(
        M.map_(M.fromTask(XR.make(z)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
          O.fold_(
            is,
            () => T.chain_(state.get, (s) => Push.emit(s, A.empty())),
            (is) =>
              pipe(
                state.get,
                T.chain((s) => f(s, is)),
                T.mapError((e) => Tu.tuple_(E.left(e), A.empty<I>())),
                T.chain((s) =>
                  cont(s) ? T.apSecond_(state.set(s), Push.more) : Push.emit(s, A.empty<I>())
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
export function fromFoldLeftChunksM<R, E, I, Z>(
  z: Z,
  f: (z: Z, i: ReadonlyArray<I>) => T.Task<R, E, Z>
): Sink<R, E, I, never, Z> {
  return dropLeftover(fromFoldChunksM_(z, (_) => true, f));
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function fromFoldChunks<I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: ReadonlyArray<I>) => Z
): Sink<unknown, never, I, I, Z> {
  return fromFoldChunksM_(z, cont, (z, i) => T.succeed(f(z, i)));
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function fromFoldLeftChunks<I, Z>(
  z: Z,
  f: (z: Z, i: ReadonlyArray<I>) => Z
): Sink<unknown, never, I, never, Z> {
  return dropLeftover(fromFoldChunks(z, () => true, f));
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 *
 * This sink may terminate in the middle of a chunk and discard the rest of it. See the discussion on the
 * ZSink class scaladoc on sinks vs. transducers.
 */
export function fromFoldM<R, E, I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: I) => T.Task<R, E, Z>
): Sink<R, E, I, I, Z> {
  const foldChunk = (
    z: Z,
    chunk: ReadonlyArray<I>,
    i: number,
    len: number
  ): T.Task<R, readonly [E, ReadonlyArray<I>], readonly [Z, O.Option<ReadonlyArray<I>>]> => {
    if (i === len) {
      return T.succeed([z, O.none()]);
    } else {
      return T.foldM_(
        f(z, chunk[i]),
        (e) => T.fail([e, A.drop_(chunk, i + 1)]),
        (s) =>
          cont(s) ? foldChunk(s, chunk, i + 1, len) : T.succeed([s, O.some(A.drop_(chunk, i + 1))])
      );
    }
  };

  if (cont(z)) {
    return new Sink(
      M.map_(M.fromTask(XR.make(z)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
        O.fold_(
          is,
          () => T.chain_(state.get, (s) => Push.emit(s, A.empty())),
          (is) =>
            T.chain_(state.get, (z) =>
              T.foldM_(
                foldChunk(z, is, 0, is.length),
                (err) => Push.fail(Tu.fst(err), Tu.snd(err)),
                ([st, l]) =>
                  O.fold_(
                    l,
                    () => T.apSecond_(state.set(st), Push.more),
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
export function fromFold<I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: I) => Z
): Sink<unknown, never, I, I, Z> {
  const foldChunk = (
    z: Z,
    chunk: ReadonlyArray<I>,
    i: number,
    len: number
  ): Sy.IO<readonly [Z, O.Option<ReadonlyArray<I>>]> =>
    Sy.gen(function* (_) {
      if (i === len) {
        return [z, O.none()];
      } else {
        const z1 = f(z, chunk[i]);
        return cont(z1)
          ? yield* _(foldChunk(z1, chunk, i + 1, len))
          : [z1, O.some(A.drop_(chunk, i + 1))];
      }
    });

  if (cont(z)) {
    return new Sink(
      M.map_(M.fromTask(XR.make(z)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
        O.fold_(
          is,
          () => T.chain_(state.get, (s) => Push.emit(s, A.empty())),
          (is) =>
            T.chain_(state.get, (z) =>
              T.chain_(foldChunk(z, is, 0, is.length), ([st, l]) =>
                O.fold_(
                  l,
                  () => T.apSecond_(state.set(st), Push.more),
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
export function fromFoldLeft<I, Z>(z: Z, f: (z: Z, i: I) => Z): Sink<unknown, never, I, never, Z> {
  return dropLeftover(fromFold(z, (_) => true, f));
}
