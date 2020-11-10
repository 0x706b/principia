import type * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";

import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from "../../HKT";
import type { Summoner } from "../../summoner";
import { memoize, merge } from "../../utils";
import { IntersectionDecoder } from "./intersection";
import { NewtypeDecoder } from "./newtype";
import { NullableDecoder } from "./nullable";
import { ObjectDecoder } from "./object";
import { PrimitivesDecoder } from "./primitives";
import { RecordDecoder } from "./record";
import { RecursiveDecoder } from "./recursive";
import { RefinementDecoder } from "./refinement";
import { SetDecoder } from "./set";
import { SumDecoder } from "./sum";

export const _allDecoderInterpreters = <Env extends AnyEnv>() =>
   merge(
      PrimitivesDecoder<Env>(),
      RefinementDecoder<Env>(),
      RecordDecoder<Env>(),
      ObjectDecoder<Env>(),
      NewtypeDecoder<Env>(),
      RecursiveDecoder<Env>(),
      SetDecoder<Env>(),
      SumDecoder<Env>(),
      NullableDecoder<Env>(),
      IntersectionDecoder<Env>()
   );

export const allDecoderInterpreters = memoize(_allDecoderInterpreters) as typeof _allDecoderInterpreters;

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
   env: {
      [K in D.URI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K];
   }
) => <S, R, E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>): D.Decoder<unknown, A> =>
   pipe(env, F.derive(allDecoderInterpreters()));
