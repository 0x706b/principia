import { identity } from "../../../Function";
import type { Effect } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachUnitPar_ } from "./foreachUnitPar";

export const collectAllPar = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreachPar_(efs, identity);

export const collectAllUnitPar = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreachUnitPar_(efs, identity);
