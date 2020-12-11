import * as C from "../../Chunk";
import type { Predicate } from "../../Function";
import { pipe } from "../../Function";
import * as T from "../../IO";
import * as Ref from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import { Stream } from "../model";

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile_<R, E, O>(ma: Stream<R, E, O>, pred: Predicate<O>): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("chunks", () => ma.proc),
      M.bindS("keepDroppingRef", () => T.toManaged_(Ref.make(true))),
      M.letS("pull", ({ chunks, keepDroppingRef }) => {
        const go: T.IO<R, O.Option<E>, C.Chunk<O>> = T.chain_(chunks, (chunk) =>
          T.chain_(keepDroppingRef.get, (keepDropping) => {
            if (!keepDropping) {
              return T.succeed(chunk);
            } else {
              const remaining = C.dropWhile_(chunk, pred);
              const empty = remaining.length <= 0;

              if (empty) {
                return go;
              } else {
                return T.as_(keepDroppingRef.set(false), () => remaining);
              }
            }
          })
        );

        return go;
      }),
      M.map(({ pull }) => pull)
    )
  );
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile<O>(pred: Predicate<O>) {
  return <R, E>(ma: Stream<R, E, O>) => dropWhile_(ma, pred);
}
