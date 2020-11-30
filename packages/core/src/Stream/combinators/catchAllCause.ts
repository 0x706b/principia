import { pipe } from "../../Function";
import * as I from "../../IO";
import * as C from "../../IO/Cause";
import { sequential } from "../../IO/ExecutionStrategy";
import * as Ex from "../../IO/Exit";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import * as RM from "../../Managed/ReleaseMap";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { Stream } from "../model";
import type * as Pull from "../Pull";

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, E, A, R1, E2, B>(
  stream: Stream<R, E, A>,
  f: (e: C.Cause<E>) => Stream<R1, E2, B>
): Stream<R & R1, E2, B | A> {
  type NotStarted = { _tag: "NotStarted" };
  type Self<E0> = { _tag: "Self"; pull: Pull.Pull<R, E0, A> };
  type Other = { _tag: "Other"; pull: Pull.Pull<R1, E2, B> };
  type State<E0> = NotStarted | Self<E0> | Other;

  return new Stream<R & R1, E2, A | B>(
    pipe(
      M.do,
      M.bindS(
        "finalizerRef",
        () => M.finalizerRef(RM.noopFinalizer) as M.Managed<R, never, XR.URef<RM.Finalizer>>
      ),
      M.bindS("ref", () =>
        pipe(
          XR.make<State<E>>({ _tag: "NotStarted" }),
          I.toManaged()
        )
      ),
      M.letS("pull", ({ finalizerRef, ref }) => {
        const closeCurrent = (cause: C.Cause<any>) =>
          pipe(
            finalizerRef,
            XR.getAndSet(RM.noopFinalizer),
            I.chain((f) => f(Ex.failure(cause))),
            I.makeUninterruptible
          );

        const open = <R, E0, O>(stream: Stream<R, E0, O>) => (
          asState: (_: Pull.Pull<R, E0, O>) => State<E>
        ) =>
          I.uninterruptibleMask(({ restore }) =>
            pipe(
              RM.make,
              I.chain((releaseMap) =>
                pipe(
                  finalizerRef.set((exit) => M.releaseAll(exit, sequential)(releaseMap)),
                  I.chain(() =>
                    pipe(
                      restore(stream.proc.io),
                      I.gives((_: R) => [_, releaseMap] as [R, RM.ReleaseMap]),
                      I.map(([_, __]) => __),
                      I.tap((pull) => ref.set(asState(pull)))
                    )
                  )
                )
              )
            )
          );

        const failover = (cause: C.Cause<Option<E>>) =>
          pipe(
            cause,
            C.sequenceCauseOption,
            O.fold(
              () => I.fail(O.none()),
              (cause) =>
                pipe(
                  closeCurrent(cause),
                  I.chain(() =>
                    open(f(cause))((pull) => ({
                      _tag: "Other",
                      pull
                    }))
                  ),
                  I.flatten
                )
            )
          );

        return pipe(
          ref.get,
          I.chain((s) => {
            switch (s._tag) {
              case "NotStarted": {
                return pipe(
                  open(stream)((pull) => ({ _tag: "Self", pull })),
                  I.flatten,
                  I.catchAllCause(failover)
                );
              }
              case "Self": {
                return pipe(s.pull, I.catchAllCause(failover));
              }
              case "Other": {
                return s.pull;
              }
            }
          })
        );
      }),
      M.map(({ pull }) => pull)
    )
  );
}

export function catchAllCause<E, R1, E1, B>(
  f: (e: C.Cause<E>) => Stream<R1, E1, B>
): <R, A>(stream: Stream<R, E, A>) => Stream<R & R1, E1, B | A> {
  return (stream) => catchAllCause_(stream, f);
}
