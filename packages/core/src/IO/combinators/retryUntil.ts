import { flow } from "../../Function";
import type { IO } from "../_core";
import { pure } from "../_core";
import { retryUntilM_ } from "./retryUntilM";

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export function retryUntil_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean): IO<R, E, A> {
  return retryUntilM_(fa, flow(f, pure));
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntil<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryUntil_(fa, f);
}
