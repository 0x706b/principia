import { mapBothPar_ } from "./apply-par";
import type { Task } from "./model";

/*
 * -------------------------------------------
 * Parallel Applicative Task
 * -------------------------------------------
 */

/**
 * Parallely zips two `Tasks`
 */
export function bothPar_<R, E, A, R1, E1, A1>(ma: Task<R, E, A>, mb: Task<R1, E1, A1>) {
   return mapBothPar_(ma, mb, (a, b) => [a, b] as const);
}

/**
 * Parallely zips two `Tasks`
 */
export function bothPar<R1, E1, A1>(
   mb: Task<R1, E1, A1>
): <R, E, A>(ma: Task<R, E, A>) => Task<R & R1, E1 | E, readonly [A, A1]> {
   return (ma) => bothPar_(ma, mb);
}
