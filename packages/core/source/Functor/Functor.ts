import * as HKT from "../HKT";
import type { MapF, MapFComposition, UC_MapF, UC_MapFComposition } from "./MapF";

export interface Functor<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: MapF<F, C>;
   readonly map_: UC_MapF<F, C>;
}

export interface FunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
   extends HKT.CompositionBase2<F, G, CF, CG> {
   readonly map: MapFComposition<F, G, CF, CG>;
   readonly map_: UC_MapFComposition<F, G, CF, CG>;
}

export function getFunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
   F: Functor<F, CF>,
   G: Functor<G, CG>
): FunctorComposition<F, G, CF, CG>;
export function getFunctorComposition<F, G>(F: Functor<HKT.UHKT<F>>, G: Functor<HKT.UHKT<G>>) {
   const map_ = <A, B>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (a: A) => B): HKT.HKT<F, HKT.HKT<G, B>> =>
      F.map_(fga, G.map(f));
   return HKT.instance<FunctorComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      map: (f) => (fga) => map_(fga, f),
      map_
   });
}
