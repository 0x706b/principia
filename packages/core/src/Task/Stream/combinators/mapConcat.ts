import * as A from "../../../Array";
import { identity, pipe } from "../../../Function";
import * as T from "../../Task";
import { mapChunks_, mapM } from "../functor";
import type { Stream } from "../model";

export function mapConcat_<R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => Iterable<B>) {
  return mapChunks_(stream, (chunks) => A.chain_(chunks, (a) => A.from(f(a))));
}

export function mapConcat<A, B>(
  f: (a: A) => Iterable<B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => mapConcat_(stream, f);
}

export function mapConcatChunk_<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => ReadonlyArray<B>
): Stream<R, E, B> {
  return mapChunks_(stream, (chunks) => A.chain_(chunks, f));
}

export function mapConcatChunk<A, B>(
  f: (a: A) => ReadonlyArray<B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => mapConcatChunk_(stream, f);
}

export function mapConcatChunkM_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(stream, mapM(f), mapConcatChunk(identity));
}

export function mapConcatChunkM<A, R1, E1, B>(
  f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (stream) => mapConcatChunkM_(stream, f);
}

export function mapConcatM_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => T.Task<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(
    stream,
    mapConcatChunkM((a) => T.map_(f(a), (_) => A.from(_)))
  );
}
