import { matchTag } from "@principia/prelude/Utils";

import * as E from "../../Either";
import { identity, pipe, tuple } from "../../Function";
import type { Option } from "../../Option";
import { none, some } from "../../Option";
import * as Mb from "../../Option";
import { AtomicReference } from "../../support";
import * as T from "../Task/core";
import type { IO, UIO } from "../Task/model";
import * as At from "./atomic";
import type { Ref, XRef } from "./model";
import { Atomic, concrete } from "./model";

/**
 * Creates a new `XRef` with the specified value.
 */
export const makeRef = <A>(a: A): UIO<Ref<A>> => T.total(() => new Atomic(new AtomicReference(a)));

/**
 * Creates a new `XRef` with the specified value.
 */
export const unsafeMakeRef = <A>(a: A): Ref<A> => new Atomic(new AtomicReference(a));

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect: <B, C>(
   pf: (_: B) => Option<C>
) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, Option<EB>, A, C> = (pf) => (_) =>
   _.fold(identity, some, E.right, (b) => E.fromOption_(pf(b), () => none()));

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect_: <EA, EB, A, B, C>(
   _: XRef<EA, EB, A, B>,
   pf: (_: B) => Option<C>
) => XRef<EA, Option<EB>, A, C> = (_, pf) => collect(pf)(_);

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export const bimapEither = <A, B, C, EC, D, ED>(f: (_: C) => E.Either<EC, A>, g: (_: B) => E.Either<ED, D>) => <EA, EB>(
   _: XRef<EA, EB, A, B>
): XRef<EC | EA, EB | ED, C, D> =>
   _.fold(
      (ea: EA | EC) => ea,
      (eb: EB | ED) => eb,
      f,
      g
   );

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export const bimapEither_: <EA, EB, A, B, C, EC, D, ED>(
   _: XRef<EA, EB, A, B>,
   f: (_: C) => E.Either<EC, A>,
   g: (_: B) => E.Either<ED, D>
) => XRef<EC | EA, ED | EB, C, D> = (_, f, g) => bimapEither(f, g)(_);

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export const contramapEither = <A, EC, C>(f: (_: C) => E.Either<EC, A>) => <EA, EB, B>(
   _: XRef<EA, EB, A, B>
): XRef<EC | EA, EB, C, B> =>
   pipe(
      _,
      bimapEither(f, (x) => E.right(x))
   );

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export const contramapEither_ = <A, EC, C, EA, EB, B>(
   _: XRef<EA, EB, A, B>,
   f: (_: C) => E.Either<EC, A>
): XRef<EC | EA, EB, C, B> => contramapEither(f)(_);

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap: <A, C>(f: (_: C) => A) => <EA, EB, B>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, C, B> = (f) =>
   contramapEither((c) => E.right(f(c)));

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap_: <EA, EB, B, A, C>(_: XRef<EA, EB, A, B>, f: (_: C) => A) => XRef<EA, EB, C, B> = (_, f) =>
   contramap(f)(_);

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export const bimap = <A, B, C, D>(f: (_: C) => A, g: (_: B) => D) => <EA, EB>(
   _: XRef<EA, EB, A, B>
): XRef<EA, EB, C, D> =>
   pipe(
      _,
      bimapEither(
         (c) => E.right(f(c)),
         (b) => E.right(g(b))
      )
   );

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export const bimap_ = <EA, EB, A, B, C, D>(_: XRef<EA, EB, A, B>, f: (_: C) => A, g: (_: B) => D): XRef<EA, EB, C, D> =>
   bimap(f, g)(_);

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export const bimapError: <EA, EB, EC, ED>(
   f: (_: EA) => EC,
   g: (_: EB) => ED
) => <A, B>(_: XRef<EA, EB, A, B>) => XRef<EC, ED, A, B> = (f, g) => (_) => _.fold(f, g, E.right, E.right);

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export const bimapError_: <A, B, EA, EB, EC, ED>(
   _: XRef<EA, EB, A, B>,
   f: (_: EA) => EC,
   g: (_: EB) => ED
) => XRef<EC, ED, A, B> = (_, f, g) => bimapError(f, g)(_);

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterInput_: <EA, EB, B, A, A1 extends A>(
   _: XRef<EA, EB, A, B>,
   f: (_: A1) => boolean
) => XRef<Option<EA>, EB, A1, B> = (_, f) =>
   _.fold(some, identity, (a) => (f(a) ? E.right(a) : E.left(none())), E.right);

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterInput: <A, A1 extends A>(
   f: (_: A1) => boolean
) => <EA, EB, B>(_: XRef<EA, EB, A, B>) => XRef<Option<EA>, EB, A1, B> = (f) => (_) => filterInput_(_, f);

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput_: <EA, EB, A, B>(
   _: XRef<EA, EB, A, B>,
   f: (_: B) => boolean
) => XRef<EA, Option<EB>, A, B> = (_, f) =>
   _.fold(identity, some, E.right, (b) => (f(b) ? E.right(b) : E.left(none())));

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput: <B>(
   f: (_: B) => boolean
) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, Option<EB>, A, B> = (f) => (_) => filterOutput_(_, f);

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export const mapEither: <B, EC, C>(
   f: (_: B) => E.Either<EC, C>
) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, EC | EB, A, C> = (f) => bimapEither((a) => E.right(a), f);

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export const mapEither_: <EA, EB, A, B, EC, C>(
   _: XRef<EA, EB, A, B>,
   f: (_: B) => E.Either<EC, C>
) => XRef<EA, EC | EB, A, C> = (_, f) => bimapEither_(_, (a) => E.right(a), f);

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map: <B, C>(f: (_: B) => C) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, A, C> = (f) =>
   mapEither((b) => E.right(f(b)));

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map_: <EA, EB, A, B, C>(_: XRef<EA, EB, A, B>, f: (_: B) => C) => XRef<EA, EB, A, C> = (_, f) =>
   mapEither_(_, (b) => E.right(f(b)));

/**
 * Returns a read only view of the `XRef`.
 */
export const readOnly: <EA, EB, A, B>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, never, B> = (_) => _;

/**
 * Returns a write only view of the `XRef`.
 */
export const writeOnly: <EA, EB, A, B>(_: XRef<EA, EB, A, B>) => XRef<EA, void, A, never> = (_) =>
   _.fold(
      identity,
      () => undefined,
      E.right,
      () => E.left(undefined)
   );

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export const modify = <B, A>(f: (a: A) => readonly [B, A]) => <EA, EB>(self: XRef<EA, EB, A, A>): IO<EA | EB, B> =>
   pipe(
      self,
      concrete,
      matchTag({
         Atomic: At.modify(f),
         Derived: (self) =>
            pipe(
               self.value,
               At.modify((s) =>
                  pipe(
                     s,
                     self.getEither,
                     E.fold(
                        (e) => tuple(E.left(e), s),
                        (a1) =>
                           pipe(f(a1), ([b, a2]) =>
                              pipe(
                                 a2,
                                 self.setEither,
                                 E.fold(
                                    (e) => tuple(E.left(e), s),
                                    (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                                 )
                              )
                           )
                     )
                  )
               ),
               T.absolve
            ),
         DerivedAll: (self) =>
            pipe(
               self.value,
               At.modify((s) =>
                  pipe(
                     s,
                     self.getEither,
                     E.fold(
                        (e) => tuple(E.left(e), s),
                        (a1) =>
                           pipe(f(a1), ([b, a2]) =>
                              pipe(
                                 self.setEither(a2)(s),
                                 E.fold(
                                    (e) => tuple(E.left(e), s),
                                    (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                                 )
                              )
                           )
                     )
                  )
               ),
               T.absolve
            )
      })
   );

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export const modify_ = <EA, EB, B, A>(self: XRef<EA, EB, A, A>, f: (a: A) => [B, A]): IO<EA | EB, B> => modify(f)(self);

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export const modifySome = <B>(def: B) => <A>(f: (a: A) => Option<[B, A]>) => <EA, EB>(
   self: XRef<EA, EB, A, A>
): IO<EA | EB, B> =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.modifySome(def)(f) },
         modify((a) =>
            pipe(
               f(a),
               Mb.getOrElse(() => tuple(def, a))
            )
         )
      )
   );

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export const modifySome_ = <EA, EB, A, B>(
   self: XRef<EA, EB, A, A>,
   def: B,
   f: (a: A) => Option<[B, A]>
): IO<EA | EB, B> => modifySome(def)(f)(self);

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export const getAndSet = <A>(a: A) => <EA, EB>(self: XRef<EA, EB, A, A>) =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.getAndSet(a) },
         modify((v) => tuple(v, a))
      )
   );

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export const getAndSet_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, a: A) => getAndSet(a)(self);

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export const getAndUpdate = <A>(f: (a: A) => A) => <EA, EB>(self: XRef<EA, EB, A, A>) =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.getAndUpdate(f) },
         modify((v) => tuple(v, f(v)))
      )
   );

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export const getAndUpdate_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => A) => getAndUpdate(f)(self);

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome = <A>(f: (a: A) => Option<A>) => <EA, EB>(self: XRef<EA, EB, A, A>) =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.getAndUpdateSome(f) },
         modify((v) =>
            pipe(
               f(v),
               Mb.getOrElse(() => v),
               (a) => tuple(v, a)
            )
         )
      )
   );

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => Option<A>) =>
   getAndUpdateSome(f)(self);

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export const update = <A>(f: (a: A) => A) => <EA, EB>(self: XRef<EA, EB, A, A>): IO<EA | EB, void> =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.update(f) },
         modify((v) => tuple(undefined, f(v)))
      )
   );

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export const update_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => A): IO<EA | EB, void> => update(f)(self);

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export const updateAndGet = <A>(f: (a: A) => A) => <EA, EB>(self: XRef<EA, EB, A, A>): IO<EA | EB, A> =>
   pipe(
      self,
      concrete,
      matchTag({ Atomic: At.updateAndGet(f) }, (self) =>
         pipe(
            self,
            modify((v) => pipe(f(v), (result) => tuple(result, result))),
            T.chain(() => self.get)
         )
      )
   );

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export const updateAndGet_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => A): IO<EA | EB, A> =>
   updateAndGet(f)(self);

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export const updateSome = <A>(f: (a: A) => Option<A>) => <EA, EB>(self: XRef<EA, EB, A, A>): IO<EA | EB, void> =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.updateSome(f) },
         modify((v) =>
            pipe(
               f(v),
               Mb.getOrElse(() => v),
               (a) => tuple(undefined, a)
            )
         )
      )
   );

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export const updateSome_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => Option<A>): IO<EA | EB, void> =>
   updateSome(f)(self);

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export const updateSomeAndGet = <A>(f: (a: A) => Option<A>) => <EA, EB>(self: XRef<EA, EB, A, A>): IO<EA | EB, A> =>
   pipe(
      self,
      concrete,
      matchTag(
         { Atomic: At.updateSomeAndGet(f) },
         modify((v) =>
            pipe(
               f(v),
               Mb.getOrElse(() => v),
               (result) => tuple(result, result)
            )
         )
      )
   );

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export const updateSomeAndGet_ = <EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => Option<A>): IO<EA | EB, A> =>
   updateSomeAndGet(f)(self);

/**
 * Unsafe update value in a Ref<A>
 */
export const unsafeUpdate = <A>(f: (a: A) => A) => (self: Ref<A>) =>
   pipe(
      self,
      concrete,
      matchTag({
         Atomic: At.unsafeUpdate(f),
         Derived: (self) =>
            pipe(
               self.value,
               At.unsafeUpdate((s) => pipe(s, self.getEither, E.merge, f, self.setEither, E.merge))
            ),
         DerivedAll: (self) =>
            pipe(
               self.value,
               At.unsafeUpdate((s) => pipe(s, self.getEither, E.merge, f, (a) => self.setEither(a)(s), E.merge))
            )
      })
   );

/**
 * Unsafe update value in a Ref<A>
 */
export const unsafeUpdate_ = <A>(self: Ref<A>, f: (a: A) => A) => unsafeUpdate(f)(self);

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export const fold = <EA, EB, A, B, EC, ED, C = A, D = B>(
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ca: (_: C) => E.Either<EC, A>,
   bd: (_: B) => E.Either<ED, D>
) => (self: XRef<EA, EB, A, B>): XRef<EC, ED, C, D> => self.fold(ea, eb, ca, bd);

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export const fold_ = <EA, EB, A, B, EC, ED, C = A, D = B>(
   self: XRef<EA, EB, A, B>,
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ca: (_: C) => E.Either<EC, A>,
   bd: (_: B) => E.Either<ED, D>
): XRef<EC, ED, C, D> => self.fold(ea, eb, ca, bd);

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export const foldAll = <EA, EB, A, B, EC, ED, C = A, D = B>(
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ec: (_: EB) => EC,
   ca: (_: C) => (_: B) => E.Either<EC, A>,
   bd: (_: B) => E.Either<ED, D>
) => (self: XRef<EA, EB, A, B>): XRef<EC, ED, C, D> => self.foldAll(ea, eb, ec, ca, bd);

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export const foldAll_ = <EA, EB, A, B, EC, ED, C = A, D = B>(
   self: XRef<EA, EB, A, B>,
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ec: (_: EB) => EC,
   ca: (_: C) => (_: B) => E.Either<EC, A>,
   bd: (_: B) => E.Either<ED, D>
): XRef<EC, ED, C, D> => self.foldAll(ea, eb, ec, ca, bd);

/**
 * Reads the value from the `XRef`.
 */
export const get = <EA, EB, A, B>(self: XRef<EA, EB, A, B>) => self.get;

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export const set = <A>(a: A) => <EA, EB, B>(self: XRef<EA, EB, A, B>) => self.set(a);

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export const set_ = <EA, EB, B, A>(self: XRef<EA, EB, A, B>, a: A) => self.set(a);