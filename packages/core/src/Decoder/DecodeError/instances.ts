import type { Semigroup } from "@principia/prelude/Semigroup";

import * as FS from "../../FreeSemigroup";
import type { DecodeError } from "./model";

export function getSemigroup<E = never>(): Semigroup<FS.FreeSemigroup<DecodeError<E>>> {
  return FS.getSemigroup();
}
