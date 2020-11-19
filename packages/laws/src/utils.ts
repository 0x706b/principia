import type { Eq } from "@principia/prelude/Eq";

export const allEquals = <A>(E: Eq<A>) => (a: A, ...as: Array<A>): boolean => {
  return as.every((item) => E.equals_(item, a));
};
