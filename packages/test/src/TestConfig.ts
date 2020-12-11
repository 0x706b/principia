import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import type { Layer } from "@principia/core/Layer";
import * as L from "@principia/core/Layer";

export interface TestConfig {
  readonly repeats: number;
  readonly retries: number;
  readonly samples: number;
  readonly shrinks: number;
}

export const TestConfig = tag<TestConfig>();

export function live(_: TestConfig): Layer<unknown, never, Has<TestConfig>> {
  return L.pure(TestConfig)(_);
}
