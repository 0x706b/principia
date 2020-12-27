import type { Cause } from "../Cause";
import type { Chunk } from "../Chunk";
import type { IO } from "../IO";
import type { Managed } from "../Managed";
import type { Finalizer } from "../Managed/ReleaseMap";
import type * as Eq from "@principia/base/data/Eq";
import type { Predicate, Refinement } from "@principia/base/data/Function";
import type { Option } from "@principia/base/data/Option";

import * as E from "@principia/base/data/Either";
import { flow, not, pipe, tuple } from "@principia/base/data/Function";
import * as Map from "@principia/base/data/Map";
import * as O from "@principia/base/data/Option";
import * as Set from "@principia/base/data/Set";
import * as Tup from "@principia/base/data/Tuple";

import * as C from "../Chunk";
import * as Ex from "../Exit";
import * as I from "../IO";
import * as XRef from "../IORef";
import * as XRefM from "../IORefM";
import * as M from "../Managed";
import { Sink } from "./internal/Sink";
import { Transducer } from "./internal/Transducer";

export { Transducer };

/**
 * Contract notes for transducers:
 * - When a None is received, the transducer must flush all of its internal state
 *   and remain empty until subsequent Some(Chunk) values.
 *
 *   Stated differently, after a first push(None), all subsequent push(None) must
 *   result in empty [].
 */
export function transducer<R, E, I, O, R1>(
  push: Managed<R, never, (c: Option<Chunk<I>>) => IO<R1, E, Chunk<O>>>
): Transducer<R & R1, E, I, O> {
  return new Transducer<R & R1, E, I, O>(push);
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a transducer that always fails with the specified failure.
 */
export function fail<E>(e: E): Transducer<unknown, E, unknown, never> {
  return new Transducer(M.succeed((_) => I.fail(e)));
}

/**
 * Creates a transducer that always dies with the specified exception.
 */
export function die(error: unknown): Transducer<unknown, never, unknown, never> {
  return new Transducer(M.succeed((_) => I.die(error)));
}

/**
 * Creates a transducer that always fails with the specified cause.
 */
export function halt<E>(c: Cause<E>): Transducer<unknown, E, unknown, never> {
  return new Transducer(M.succeed((_) => I.halt(c)));
}

/**
 * The identity transducer. Passes elements through.
 */
export function identity<I>(): Transducer<unknown, never, I, I> {
  return fromPush(O.fold(() => I.succeed(C.empty()), I.succeed));
}

/**
 * Creates a transducer from a chunk processing function.
 */
export function fromPush<R, E, I, O>(
  push: (input: O.Option<Chunk<I>>) => I.IO<R, E, Chunk<O>>
): Transducer<R, E, I, O> {
  return new Transducer(M.succeed(push));
}

/**
 * Creates a transducer that always evaluates the specified effect.
 */
export function fromEffect<R, E, A>(io: I.IO<R, E, A>): Transducer<R, E, unknown, A> {
  return new Transducer(M.succeed((_: any) => I.map_(io, C.single)));
}

/**
 * Creates a transducer that purely transforms incoming values.
 */
export function fromFunction<I, O>(f: (i: I) => O): Transducer<unknown, never, I, O> {
  return map_(identity(), f);
}

/**
 * Creates a transducer that effectfully transforms incoming values.
 */
export function fromFunctionM<R, E, I, O>(f: (i: I) => I.IO<R, E, O>): Transducer<R, E, I, O> {
  return mapM_(identity(), f);
}

/**
 * Creates a transducer that returns the first element of the stream, if it exists.
 */
export function head<O>(): Transducer<unknown, never, O, O.Option<O>> {
  return reduce(O.none(), (acc, o) =>
    O.fold_(
      acc,
      () => O.some(o),
      () => acc
    )
  );
}

/**
 * Creates a transducer that returns the last element of the stream, if it exists.
 */
export function last<O>(): Transducer<unknown, never, O, O.Option<O>> {
  return reduce(O.none(), (_, a) => O.some(a));
}

/**
 * Emits the provided chunk before emitting any other value.
 */
export function prepend<O>(values: Chunk<O>): Transducer<unknown, never, O, O> {
  return new Transducer(
    M.map_(XRef.makeManaged(values), (state) => (is: O.Option<Chunk<O>>) =>
      O.fold_(
        is,
        () => XRef.getAndSet_(state, C.empty()),
        (xs) =>
          pipe(
            state,
            XRef.getAndSet(C.empty()),
            I.map((c) => (C.isEmpty(c) ? xs : C.concat_(c, xs)))
          )
      )
    )
  );
}

/**
 * Reads the first n values from the stream and uses them to choose the transducer that will be used for the remainder of the stream.
 * If the stream ends before it has collected n values the partial chunk will be provided to f.
 */
export function branchAfter<R, E, I, O>(
  n: number,
  f: (c: Chunk<I>) => Transducer<R, E, I, O>
): Transducer<R, E, I, O> {
  interface Collecting {
    _tag: "Collecting";
    data: Chunk<I>;
  }
  interface Emitting {
    _tag: "Emitting";
    finalizer: Finalizer;
    push: (is: O.Option<Chunk<I>>) => I.IO<R, E, Chunk<O>>;
  }
  type State = Collecting | Emitting;
  const initialState: State = {
    _tag: "Collecting",
    data: C.empty()
  };

  const toCollect = Math.max(0, n);

  return new Transducer(
    M.chain_(M.scope(), (scope) =>
      M.map_(XRefM.makeManaged<State>(initialState), (state) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () =>
            pipe(
              XRefM.getAndSet_(state, initialState),
              I.flatMap((s) => {
                switch (s._tag) {
                  case "Collecting": {
                    return M.use_(f(s.data).push, (f) => f(O.none()));
                  }
                  case "Emitting": {
                    return I.apFirst_(s.push(O.none()), s.finalizer(Ex.unit()));
                  }
                }
              })
            ),
          (data) =>
            XRefM.modify_(state, (s) => {
              switch (s._tag) {
                case "Emitting": {
                  return I.map_(s.push(O.some(data)), (_) => [_, s] as const);
                }
                case "Collecting": {
                  if (C.isEmpty(data)) {
                    return I.succeed([C.empty<O>(), s] as const);
                  } else {
                    const remaining = toCollect - s.data.length;
                    if (remaining <= data.length) {
                      const [newCollected, remainder] = C.splitAt_(data, remaining);
                      return I.flatMap_(
                        scope.apply(f(C.concat_(s.data, newCollected)).push),
                        ([finalizer, push]) =>
                          I.map_(
                            push(O.some(remainder)),
                            (_) => [_, { _tag: "Emitting", finalizer, push }] as const
                          )
                      );
                    } else {
                      return I.succeed([
                        C.empty<O>(),
                        { _tag: "Collecting", data: C.concat_(s.data, data) }
                      ] as const);
                    }
                  }
                }
              }
            })
        )
      )
    )
  );
}

/**
 * Creates a transducer that starts consuming values as soon as one fails
 * the predicate `p`.
 */
export function dropWhile<I>(predicate: Predicate<I>): Transducer<unknown, never, I, I> {
  return new Transducer(
    M.map_(XRef.makeManaged(true), (dropping) => (is: O.Option<Chunk<I>>) =>
      O.fold_(
        is,
        () => I.succeed(C.empty()),
        (is) =>
          XRef.modify_(dropping, (b) => {
            switch (b) {
              case true: {
                const is1 = C.dropWhile_(is, predicate);
                return [is1, is1.length === 0];
              }
              case false: {
                return [is, false];
              }
            }
          })
      )
    )
  );
}

/**
 * Creates a transducer that starts consuming values as soon as one fails
 * the effectful predicate `p`.
 */
export function dropWhileM<R, E, I>(p: (i: I) => I.IO<R, E, boolean>): Transducer<R, E, I, I> {
  return new Transducer(
    pipe(
      M.do,
      M.bindS("dropping", () => XRef.makeManaged(true)),
      M.letS("push", ({ dropping }) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () => I.succeed(C.empty<I>()),
          (is) =>
            pipe(
              dropping.get,
              I.flatMap((b) =>
                b
                  ? I.map_(C.dropWhileIO_(is, p), (l) => [l, C.isEmpty(l)] as const)
                  : I.succeed([is, false] as const)
              ),
              I.flatMap(([is, pt]) => I.as_(dropping.set(pt), () => is))
            )
        )
      ),
      M.map(({ push }) => push)
    )
  );
}

/**
 * Creates a transducer by folding over a structure of type `O` for as long as
 * `contFn` results in `true`. The transducer will emit a value when `contFn`
 * evaluates to `false` and then restart the folding.
 */
export function fold<I, O>(
  initial: O,
  contFn: (o: O) => boolean,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  const go = (in_: Chunk<I>, state: O, progress: boolean): readonly [Chunk<O>, O, boolean] =>
    C.foldLeft_(in_, [C.empty<O>(), state, progress] as const, ([os0, state, _], i) => {
      const o = f(state, i);
      if (contFn(o)) {
        return [os0, o, true] as const;
      } else {
        return [C.append_(os0, o), initial, false] as const;
      }
    });

  return new Transducer(
    M.map_(XRef.makeManaged(O.some(initial)), (state) => (is: O.Option<Chunk<I>>) =>
      O.fold_(
        is,
        () => pipe(XRef.getAndSet_(state, O.none()), I.map(O.fold(() => C.empty(), C.single))),
        (in_) =>
          XRef.modify_(state, (s) => {
            const [o, s2, progress] = go(
              in_,
              O.getOrElse_(s, () => initial),
              O.isSome(s)
            );
            if (progress) {
              return [o, O.some(s2)];
            } else {
              return [o, O.none()];
            }
          })
      )
    )
  );
}

/**
 * Creates a transducer by folding over a structure of type `O`. The transducer will
 * fold the inputs until the stream ends, resulting in a stream with one element.
 */
export function reduce<I, O>(
  initial: O,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  return fold(initial, () => true, f);
}

/**
 * Creates a sink by effectfully folding over a structure of type `S`.
 */
export function foldM<R, E, I, O>(
  initial: O,
  cont: (o: O) => boolean,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  const init = O.some(initial);
  const go = (
    in_: Chunk<I>,
    state: O,
    progress: boolean
  ): I.IO<R, E, readonly [Chunk<O>, O, boolean]> =>
    C.foldLeft_(
      in_,
      I.succeed([C.empty(), state, progress]) as I.IO<R, E, readonly [Chunk<O>, O, boolean]>,
      (b, i) =>
        I.flatMap_(b, ([os0, state, _]) =>
          I.map_(f(state, i), (o) => {
            if (cont(o)) {
              return [os0, o, true] as const;
            } else {
              return [C.append_(os0, o), initial, false] as const;
            }
          })
        )
    );
  return new Transducer(
    M.map_(XRef.makeManaged(init), (state) => (is: O.Option<Chunk<I>>) =>
      O.fold_(
        is,
        () => pipe(state, XRef.getAndSet(O.none()), I.map(O.fold(() => C.empty(), C.single))),
        (in_) =>
          pipe(
            state,
            XRef.get,
            I.flatMap((s) =>
              go(
                in_,
                O.getOrElse_(s, () => initial),
                O.isSome(s)
              )
            ),
            I.flatMap(([os, s, progress]) =>
              progress
                ? I.apSecond_(state.set(O.some(s)), I.succeed(os))
                : I.apSecond_(state.set(O.none()), I.succeed(os))
            )
          )
      )
    )
  );
}

/**
 * Creates a transducer by effectfully folding over a structure of type `O`. The transducer will
 * fold the inputs until the stream ends, resulting in a stream with one element.
 */
export function reduceM<R, E, I, O>(
  initial: O,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  return foldM(initial, () => true, f);
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 */
export function foldUntil<I, O>(
  initial: O,
  max: number,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  return pipe(
    fold(
      tuple(initial, 0),
      ([_, n]) => n < max,
      ([o, count], i: I) => [f(o, i), count + 1] as const
    ),
    map(Tup.fst)
  );
}

/**
 * Creates a transducer that effectfully folds elements of type `I` into a structure
 * of type `O` until `max` elements have been folded.
 *
 * Like `foldWeightedM`, but with a constant cost function of 1.
 */
export function foldUntilM<R, E, I, O>(
  initial: O,
  max: number,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  return pipe(
    foldM(
      tuple(initial, 0),
      ([_, n]) => n < max,
      ([o, count], i: I) => I.map_(f(o, i), (o) => [o, count + 1] as const)
    ),
    map(Tup.fst)
  );
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `O` aggregate to cross `max` into smaller elements.
 *
 * Be vigilant with this function, it has to generate "simpler" values
 * or the fold may never end. A value is considered indivisible if
 * `decompose` yields the empty chunk or a single-valued chunk. In
 * these cases, there is no other choice than to yield a value that
 * will cross the threshold.
 *
 * The `foldWeightedDecomposeM` allows the decompose function
 * to return a `IO`, and consequently it allows the transducer
 * to fail.
 */
export function foldWeightedDecompose<I, O>(
  initial: O,
  costFn: (output: O, input: I) => number,
  max: number,
  decompose: (input: I) => Chunk<I>,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  interface FoldWeightedState {
    result: O;
    cost: number;
  }

  const initialState: FoldWeightedState = {
    result: initial,
    cost: 0
  };

  const go = (
    in_: Chunk<I>,
    os0: Chunk<O>,
    state: FoldWeightedState,
    dirty: boolean
  ): readonly [Chunk<O>, FoldWeightedState, boolean] =>
    C.foldLeft_(in_, [os0, state, dirty] as const, ([os0, state, _], i) => {
      const total = state.cost + costFn(state.result, i);

      if (total > max) {
        const is = decompose(i);
        if (is.length <= 1 && !dirty) {
          return [
            C.append_(os0, f(state.result, C.isNonEmpty(is) ? is[0] : i)),
            initialState,
            false
          ] as const;
        } else if (is.length <= 1 && dirty) {
          const elem = C.isNonEmpty(is) ? is[0] : i;
          return [
            C.append_(os0, state.result),
            { result: f(initialState.result, elem), cost: costFn(initialState.result, elem) },
            true
          ] as const;
        } else {
          return go(is, os0, state, dirty);
        }
      } else {
        return [os0, { result: f(state.result, i), cost: total }, true] as const;
      }
    });

  return new Transducer(
    M.map_(XRef.makeManaged(O.some(initialState)), (state) => (is: O.Option<Chunk<I>>) =>
      O.fold_(
        is,
        () =>
          pipe(
            state,
            XRef.getAndSet(O.none()),
            I.map(
              O.fold(
                () => C.empty(),
                (s) => [s.result]
              )
            )
          ),
        (in_) =>
          XRef.modify_(state, (s) => {
            const [o, s2, dirty] = go(
              in_,
              C.empty(),
              O.getOrElse_(s, () => initialState),
              O.isSome(s)
            );
            if (dirty) {
              return [o, O.some(s2)];
            } else {
              return [o, O.none()];
            }
          })
      )
    )
  );
}

/**
 * Creates a transducer that effectfully folds elements of type `I` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never end.
 * A value is considered indivisible if `decompose` yields the empty chunk or a
 * single-valued chunk. In these cases, there is no other choice than to yield
 * a value that will cross the threshold.
 *
 * See `foldWeightedDecompose` for an example.
 */
export function foldWeightedDecomposeM<R, E, I, O>(
  initial: O,
  costFn: (output: O, input: I) => I.IO<R, E, number>,
  max: number,
  decompose: (input: I) => I.IO<R, E, Chunk<I>>,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  interface FoldWeightedState {
    result: O;
    cost: number;
  }

  const initialState: FoldWeightedState = {
    result: initial,
    cost: 0
  };

  const go = (
    in_: Chunk<I>,
    os: Chunk<O>,
    state: FoldWeightedState,
    dirty: boolean
  ): I.IO<R, E, readonly [Chunk<O>, FoldWeightedState, boolean]> =>
    C.foldLeft_(
      in_,
      I.succeed([os, state, dirty]) as I.IO<R, E, readonly [Chunk<O>, FoldWeightedState, boolean]>,
      (o, i) =>
        I.flatMap_(o, ([os, state, _]) =>
          I.flatMap_(costFn(state.result, i), (cost) => {
            const total = cost + state.cost;
            if (total > max) {
              return I.flatMap_(decompose(i), (is) => {
                if (is.length <= 1 && !dirty) {
                  return I.map_(
                    f(state.result, C.isNonEmpty(is) ? is[0] : i),
                    (o) => [C.append_(os, o), initialState, false] as const
                  );
                } else if (is.length <= 1 && dirty) {
                  const elem = C.isNonEmpty(is) ? is[0] : i;
                  return I.map2_(
                    f(initialState.result, elem),
                    costFn(initialState.result, elem),
                    (result, cost) => [C.append_(os, state.result), { result, cost }, true]
                  );
                } else {
                  return go(is, os, state, dirty);
                }
              });
            } else {
              return I.map_(
                f(state.result, i),
                (o) => [os, { result: o, cost: total }, true] as const
              );
            }
          })
        )
    );

  return new Transducer(
    M.map_(XRef.makeManaged(O.some(initialState)), (state) => (is: O.Option<Chunk<I>>) =>
      O.fold_(
        is,
        () =>
          pipe(
            state,
            XRef.getAndSet(O.none()),
            I.map(
              O.fold(
                () => C.empty(),
                (s) => [s.result]
              )
            )
          ),
        (in_) =>
          pipe(
            state,
            XRef.get,
            I.flatMap((s) =>
              go(
                in_,
                C.empty(),
                O.getOrElse_(s, () => initialState),
                O.isSome(s)
              )
            ),
            I.flatMap(([os, s, dirty]) =>
              dirty
                ? I.apSecond_(state.set(O.some(s)), I.succeed(os))
                : I.apSecond_(state.set(O.none()), I.succeed(os))
            )
          )
      )
    )
  );
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the transducer to cross the `max` cost. See `foldWeightedDecompose`
 * for a variant that can handle these cases.
 */
export function foldWeighted<I, O>(
  initial: O,
  costFn: (o: O, i: I) => number,
  max: number,
  f: (o: O, i: I) => O
): Transducer<unknown, never, I, O> {
  return foldWeightedDecompose(initial, costFn, max, C.single, f);
}

/**
 * Creates a transducer accumulating incoming values into chunks of maximum size `n`.
 */
export function collectAllN<I>(n: number): Transducer<unknown, never, I, Chunk<I>> {
  const go = (
    in_: Chunk<I>,
    leftover: Chunk<I>,
    acc: Chunk<Chunk<I>>
  ): [Chunk<Chunk<I>>, Chunk<I>] => {
    const [left, nextIn] = C.splitAt_(in_, n - leftover.length);
    if (leftover.length + left.length < n) return [acc, C.concat_(leftover, left)];
    else {
      const nextOut = !C.isEmpty(leftover)
        ? C.append_(acc, C.concat_(leftover, left))
        : C.append_(acc, left);
      return go(nextIn, C.empty(), nextOut);
    }
  };

  return new Transducer(
    M.map_(XRef.makeManaged(C.empty<I>()), (state) => (is: O.Option<Chunk<I>>) =>
      O.fold_(
        is,
        () =>
          I.map_(XRef.getAndSet_(state, C.empty()), (leftover) =>
            !C.isEmpty(leftover) ? [leftover] : C.empty()
          ),
        (in_) => XRef.modify_(state, (leftover) => go(in_, leftover, C.empty()))
      )
    )
  );
}

/**
 * Creates a transducer accumulating incoming values into maps of up to `n` keys. Elements
 * are mapped to keys using the function `key`; elements mapped to the same key will
 * be merged with the function `f`.
 */
export function collectAllToMapN<K, I>(
  n: number,
  key: (i: I) => K,
  merge: (i: I, i1: I) => I
): Transducer<unknown, never, I, ReadonlyMap<K, I>> {
  return pipe(
    foldWeighted<I, ReadonlyMap<K, I>>(
      Map.empty(),
      (acc, i) => (acc.has(key(i)) ? 0 : 1),
      n,
      (acc, i) => {
        const k = key(i);
        if (acc.has(k)) return Map.insert_(acc, k, merge(acc.get(k) as I, i));
        else return Map.insert_(acc, k, i);
      }
    ),
    filter(not(Map.isEmpty))
  );
}

/**
 * Creates a transducer accumulating incoming values into sets of maximum size `n`.
 */
export function collectAllToSetN<I>(
  E: Eq.Eq<I>
): (n: number) => Transducer<unknown, never, I, ReadonlySet<I>> {
  const insertE = Set.insert_(E);
  return (n) =>
    pipe(
      foldWeighted<I, ReadonlySet<I>>(
        Set.empty(),
        (acc, i) => (acc.has(i) ? 0 : 1),
        n,
        (acc, i) => insertE(acc, i)
      ),
      filter((set) => set.size !== 0)
    );
}

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate `p`.
 */
export function collectAllWhile<I>(p: Predicate<I>): Transducer<unknown, never, I, Chunk<I>> {
  return pipe(
    fold<I, [Chunk<I>, boolean]>([C.empty(), true], Tup.snd, ([is, _], i) =>
      p(i) ? [C.append_(is, i), true] : [is, false]
    ),
    map(Tup.fst),
    filter(C.isNonEmpty)
  );
}

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful predicate `p`.
 */
export function collectAllWhileM<R, E, I>(
  p: (i: I) => I.IO<R, E, boolean>
): Transducer<R, E, I, Chunk<I>> {
  return pipe(
    foldM<R, E, I, [Chunk<I>, boolean]>([C.empty(), true], Tup.snd, ([is, _], i) =>
      I.map_(p(i), (b) => (b ? [C.append_(is, i), true] : [is, false]))
    ),
    map(Tup.fst),
    filter(C.isNonEmpty)
  );
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

/**
 * Transforms the inputs of this transducer.
 */
export function contramap_<R, E, I, O, J>(
  fa: Transducer<R, E, I, O>,
  f: (j: J) => I
): Transducer<R, E, J, O> {
  return new Transducer(M.map_(fa.push, (push) => (input) => push(O.map_(input, C.map(f)))));
}

/**
 * Transforms the inputs of this transducer.
 */
export function contramap<I, J>(
  f: (j: J) => I
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, J, O> {
  return (fa) => contramap_(fa, f);
}

/**
 * Effectually transforms the inputs of this transducer
 */
export function contramapM_<R, E, I, O, R1, E1, J>(
  fa: Transducer<R, E, I, O>,
  f: (j: J) => I.IO<R1, E1, I>
): Transducer<R & R1, E | E1, J, O> {
  return new Transducer(
    M.map_(fa.push, (push) => (is) =>
      O.fold_(
        is,
        () => push(O.none()),
        flow(
          I.foreach(f),
          I.flatMap((in_) => push(O.some(in_)))
        )
      )
    )
  );
}

/**
 * Effectually transforms the inputs of this transducer
 */
export function contramapM<R1, E1, I, J>(
  f: (j: J) => I.IO<R1, E1, I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, J, O> {
  return (fa) => contramapM_(fa, f);
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 * Filters the outputs of this transducer.
 */
export function filter_<R, E, I, O>(
  fa: Transducer<R, E, I, O>,
  predicate: Predicate<O>
): Transducer<R, E, I, O>;
export function filter_<R, E, I, O, B extends O>(
  fa: Transducer<R, E, I, O>,
  refinement: Refinement<O, B>
): Transducer<R, E, I, B>;
export function filter_<R, E, I, O>(
  fa: Transducer<R, E, I, O>,
  predicate: Predicate<O>
): Transducer<R, E, I, O> {
  return new Transducer(M.map_(fa.push, (push) => (is) => I.map_(push(is), C.filter(predicate))));
}

/**
 * Filters the outputs of this transducer.
 */
export function filter<O>(
  predicate: Predicate<O>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>;
export function filter<O, B extends O>(
  refinement: Refinement<O, B>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, B>;
export function filter<O>(
  predicate: Predicate<O>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
  return (fa) => filter_(fa, predicate);
}

/**
 * Filters the inputs of this transducer.
 */
export function filterInput_<R, E, I, O>(
  fa: Transducer<R, E, I, O>,
  predicate: Predicate<I>
): Transducer<R, E, I, O>;
export function filterInput_<R, E, I, O, I1 extends I>(
  fa: Transducer<R, E, I, O>,
  refinement: Refinement<I, I1>
): Transducer<R, E, I1, O>;
export function filterInput_<R, E, I, O>(
  fa: Transducer<R, E, I, O>,
  predicate: Predicate<I>
): Transducer<R, E, I, O> {
  return new Transducer(M.map_(fa.push, (push) => (is) => push(O.map_(is, C.filter(predicate)))));
}

/**
 * Filters the inputs of this transducer.
 */
export function filterInput<I>(
  predicate: Predicate<I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>;
export function filterInput<I, I1 extends I>(
  refinement: Refinement<I, I1>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I1, O>;
export function filterInput<I>(
  predicate: Predicate<I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
  return (fa) => filterInput_(fa, predicate);
}

/**
 * Effectually filters the inputs of this transducer.
 */
export function filterInputM_<R, E, I, O, R1, E1>(
  fa: Transducer<R, E, I, O>,
  predicate: (i: I) => I.IO<R1, E1, boolean>
): Transducer<R & R1, E | E1, I, O> {
  return new Transducer(
    M.map_(fa.push, (push) => (is) =>
      O.fold_(
        is,
        () => push(O.none()),
        flow(
          I.filter(predicate),
          I.flatMap((in_) => push(O.some(in_)))
        )
      )
    )
  );
}

/**
 * Effectually filters the inputs of this transducer.
 */
export function filterInputM<I, R1, E1>(
  predicate: (i: I) => I.IO<R1, E1, boolean>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O> {
  return (fa) => filterInputM_(fa, predicate);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Transforms the outputs of this transducer.
 */
export function map_<R, E, I, O, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => O1
): Transducer<R, E, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.map_(push(input), C.map(f))));
}

/**
 * Transforms the outputs of this transducer.
 */
export function map<O, P>(
  f: (o: O) => P
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, P> {
  return (fa) => map_(fa, f);
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks_<R, E, I, O, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunks: Chunk<O>) => Chunk<O1>
): Transducer<R, E, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.map_(push(input), f)));
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks<O, O1>(
  f: (chunks: Chunk<O>) => Chunk<O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O1> {
  return (fa) => mapChunks_(fa, f);
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksM_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, Chunk<O1>>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.flatMap_(push(input), f)));
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksM<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, Chunk<O1>>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapChunksM_(fa, f);
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapM_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => I.IO<R1, E1, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(
    M.map_(fa.push, (push) => (input) => I.flatMap_(push(input), I.foreach(f)))
  );
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapM<O, R1, E1, O1>(
  f: (o: O) => I.IO<R1, E1, O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapM_(fa, f);
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then_<R, E, I, O, R1, E1, O1>(
  self: Transducer<R, E, I, O>,
  that: Transducer<R1, E1, O, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(
    pipe(
      self.push,
      M.map2(that.push, (pushLeft, pushRight) =>
        O.fold(
          () =>
            pipe(
              pushLeft(O.none()),
              I.flatMap((cl) =>
                cl.length === 0
                  ? pushRight(O.none())
                  : pipe(pushRight(O.some(cl)), I.map2(pushRight(O.none()), C.concat_))
              )
            ),
          (inputs) =>
            pipe(
              pushLeft(O.some(inputs)),
              I.flatMap((cl) => pushRight(O.some(cl)))
            )
        )
      )
    )
  );
}

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then<R1, E1, O, O1>(
  that: Transducer<R1, E1, O, O1>
): <R, E, I>(self: Transducer<R, E, I, O>) => Transducer<R & R1, E1 | E, I, O1> {
  return (me) => then_(me, that);
}

/**
 * Compose this transducer with a sink, resulting in a sink that processes elements by piping
 * them through this transducer and piping the results into the sink.
 */
export function thenSink_<R, E, I, O, R1, E1, L, Z>(
  me: Transducer<R, E, I, O>,
  that: Sink<R1, E1, O, L, Z>
): Sink<R & R1, E | E1, I, L, Z> {
  return new Sink(
    pipe(
      M.map2_(me.push, that.push, (pushMe, pushThat) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () =>
            pipe(
              pushMe(O.none()),
              I.mapError((e) => [E.left<E | E1>(e), C.empty<L>()] as const),
              I.flatMap((chunk) => I.andThen_(pushThat(O.some(chunk)), pushThat(O.none())))
            ),
          (in_) =>
            pipe(
              pushMe(O.some(in_)),
              I.mapError((e) => [E.left(e), C.empty<L>()] as const),
              I.flatMap((chunk) => pushThat(O.some(chunk)))
            )
        )
      )
    )
  );
}

/**
 * Compose this transducer with a sink, resulting in a sink that processes elements by piping
 * them through this transducer and piping the results into the sink.
 */
export function thenSink<R1, E1, O, L, Z>(
  that: Sink<R1, E1, O, L, Z>
): <R, E, I>(me: Transducer<R, E, I, O>) => Sink<R & R1, E | E1, I, L, Z> {
  return (me) => thenSink_(me, that);
}