import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Unit Sync
 * -------------------------------------------
 */

export const unit: () => Sync<unknown, never, void> = X.unit;
