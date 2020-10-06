import { Applicative } from "../Applicative";
import * as HKT from "../HKT";
import { ChainF, UC_ChainF } from "./ChainF";
import { FlattenF } from "./FlattenF";

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C> {
   readonly _chain: UC_ChainF<F, C>;
   readonly chain: ChainF<F, C>;
   readonly flatten: FlattenF<F, C>;
}
