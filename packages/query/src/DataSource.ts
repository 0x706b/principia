import type { Request } from "./Request";
import type { Eq } from "@principia/base/data/Eq";
import type * as O from "@principia/base/data/Option";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { makeEq } from "@principia/base/data/Eq";
import { flow, not, pipe, tuple } from "@principia/base/data/Function";
import { IllegalArgumentException } from "@principia/io/Cause";
import * as C from "@principia/io/Chunk";
import * as I from "@principia/io/IO";

import { CompletedRequestMap } from "./CompletedRequestMap";
import { Described } from "./Described";

export interface DataSource<R, A> {
  readonly identifier: string;
  readonly runAll: (requests: C.Chunk<C.Chunk<A>>) => I.IO<R, never, CompletedRequestMap>;
}

export function DataSource<R, A>(
  identifier: string,
  runAll: (requests: C.Chunk<C.Chunk<A>>) => I.IO<R, never, CompletedRequestMap>
): DataSource<R, A> {
  return {
    identifier,
    runAll
  };
}

export function batchN_<R, A>(dataSource: DataSource<R, A>, n: number): DataSource<R, A> {
  return {
    identifier: `${dataSource.identifier}.batchN(${n})`,
    runAll: (requests) =>
      n < 1
        ? I.die(new IllegalArgumentException("batchN: n must be at least one"))
        : dataSource.runAll(
            C.foldLeft_(requests, C.empty(), (b, a) => C.concat_(b, C.grouped_(a, n)))
          )
  };
}

export function contramapM_<R, A, R1, B>(
  dataSource: DataSource<R, A>,
  f: Described<(b: B) => I.IO<R1, never, A>>
): DataSource<R & R1, B> {
  return {
    identifier: `${dataSource.identifier}.contramapM(${f.description})`,
    runAll: flow(I.foreach(I.foreachPar(f.value)), I.flatMap(dataSource.runAll))
  };
}

export function eitherWith_<R, A, R1, B, C>(
  ds1: DataSource<R, A>,
  ds2: DataSource<R1, B>,
  f: Described<(c: C) => E.Either<A, B>>
): DataSource<R & R1, C> {
  return {
    identifier: `${ds1.identifier}.eitherWith(${ds2.identifier}, ${f.description})`,
    runAll: flow(
      I.foreach((rs) => {
        const [left, right] = C.partitionMap_(rs, f.value);
        return pipe(
          ds1.runAll(C.single(left)),
          I.map2Par(ds2.runAll(C.single(right)), (a, b) => a.concat(b))
        );
      }),
      I.map(A.foldLeft(CompletedRequestMap.empty(), (b, a) => b.concat(a)))
    )
  };
}

export function equals(ds1: DataSource<any, any>, ds2: DataSource<any, any>): boolean {
  return ds1.identifier === ds2.identifier;
}

export function gives_<R, A, R0>(
  ds: DataSource<R, A>,
  f: Described<(r0: R0) => R>
): DataSource<R0, A> {
  return {
    identifier: `${ds.identifier}.giveSome(${f.description})`,
    runAll: flow(ds.runAll, I.gives(f.value))
  };
}

export function giveAll_<R, A>(ds: DataSource<R, A>, r: Described<R>): DataSource<unknown, A> {
  return gives_(
    ds,
    Described((_) => r.value, `(_) => ${r.description}`)
  );
}

export function race_<R, A, R1, A1 extends A>(
  ds1: DataSource<R, A>,
  ds2: DataSource<R1, A1>
): DataSource<R & R1, A1> {
  return {
    identifier: `${ds1.identifier}.race(${ds2.identifier})`,
    runAll: (requests) => pipe(ds1.runAll(requests), I.race(ds2.runAll(requests)))
  };
}

export abstract class Batched<R, A> implements DataSource<R, A> {
  abstract readonly identifier: string;
  abstract run(requests: C.Chunk<A>): I.IO<R, never, CompletedRequestMap>;
  runAll(requests: C.Chunk<C.Chunk<A>>): I.IO<R, never, CompletedRequestMap> {
    return I.reduce_(requests, CompletedRequestMap.empty(), (m, r) => {
      const newRequests = C.filter_(r, not(m.contains));
      if (C.isEmpty(newRequests)) return I.succeed(m);
      else
        return pipe(
          this.run(newRequests),
          I.map((_) => m.concat(_))
        );
    });
  }
}

export function makeBatched<R, A>(
  name: string,
  f: (requests: C.Chunk<A>) => I.IO<R, never, CompletedRequestMap>
): DataSource<R, A> {
  return new (class extends Batched<R, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return f(requests);
    }
  })();
}

export function fromFunction<A extends Request<never, B>, B>(
  name: string,
  f: (a: A) => B
): DataSource<unknown, A> {
  return new (class extends Batched<unknown, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return I.succeed(
        C.foldLeft_(requests, CompletedRequestMap.empty(), (m, k) => m.insert(k, E.right(f(k))))
      );
    }
  })();
}

export function fromFunctionBatchedM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: C.Chunk<A>) => I.IO<R, E, C.Chunk<B>>
): DataSource<R, A> {
  return new (class extends Batched<R, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return pipe(
        f(requests),
        I.fold(
          (e): C.Chunk<readonly [A, E.Either<E, B>]> =>
            C.map_(requests, (_) => tuple(_, E.left(e))),
          (bs): C.Chunk<readonly [A, E.Either<E, B>]> => C.zip_(requests, C.map_(bs, E.right))
        ),
        I.map(C.foldLeft(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
      );
    }
  })();
}

export function fromFunctionBatched<A extends Request<never, B>, B>(
  name: string,
  f: (a: C.Chunk<A>) => C.Chunk<B>
): DataSource<unknown, A> {
  return fromFunctionBatchedM(name, flow(f, I.succeed));
}

export function fromFunctionBatchedOptionM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: C.Chunk<A>) => I.IO<R, E, C.Chunk<O.Option<B>>>
): DataSource<R, A> {
  return new (class extends Batched<R, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return pipe(
        f(requests),
        I.fold(
          (e): C.Chunk<readonly [A, E.Either<E, O.Option<B>>]> =>
            C.map_(requests, (a) => tuple(a, E.left(e))),
          (bs): C.Chunk<readonly [A, E.Either<E, O.Option<B>>]> =>
            C.zip_(requests, C.map_(bs, E.right))
        ),
        I.map(C.foldLeft(CompletedRequestMap.empty(), (map, [k, v]) => map.insertOption(k, v)))
      );
    }
  })();
}

export function fromFunctionBatchedOption<A extends Request<never, B>, B>(
  name: string,
  f: (a: C.Chunk<A>) => C.Chunk<O.Option<B>>
): DataSource<unknown, A> {
  return fromFunctionBatchedOptionM(name, flow(f, I.succeed));
}

export function fromFunctionBatchedWithM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: C.Chunk<A>) => I.IO<R, E, C.Chunk<B>>,
  g: (b: B) => Request<E, B>
): DataSource<R, A> {
  return new (class extends Batched<R, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return pipe(
        f(requests),
        I.fold(
          (e): C.Chunk<readonly [Request<E, B>, E.Either<E, B>]> =>
            C.map_(requests, (a) => tuple(a, E.left(e))),
          (bs): C.Chunk<readonly [Request<E, B>, E.Either<E, B>]> =>
            C.map_(bs, (b) => tuple(g(b), E.right(b)))
        ),
        I.map(C.foldLeft(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
      );
    }
  })();
}

export function fromFunctionBatchedWith<A extends Request<never, B>, B>(
  name: string,
  f: (a: C.Chunk<A>) => C.Chunk<B>,
  g: (b: B) => Request<never, B>
): DataSource<unknown, A> {
  return fromFunctionBatchedWithM(name, flow(f, I.succeed), g);
}

export function fromFunctionM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: A) => I.IO<R, E, B>
): DataSource<R, A> {
  return new (class extends Batched<R, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return pipe(
        requests,
        I.foreachPar((a) =>
          pipe(
            f(a),
            I.either,
            I.map((r) => tuple(a, r))
          )
        ),
        I.map(C.foldLeft(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
      );
    }
  })();
}

export function fromFunctionOptionM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: A) => I.IO<R, E, O.Option<B>>
): DataSource<R, A> {
  return new (class extends Batched<R, A> {
    identifier = name;
    run(requests: C.Chunk<A>) {
      return pipe(
        requests,
        I.foreachPar((a) =>
          pipe(
            f(a),
            I.either,
            I.map((r) => tuple(a, r))
          )
        ),
        I.map(C.foldLeft(CompletedRequestMap.empty(), (map, [k, v]) => map.insertOption(k, v)))
      );
    }
  })();
}

export function fromFunctionOption<A extends Request<never, B>, B>(
  name: string,
  f: (a: A) => O.Option<B>
): DataSource<unknown, A> {
  return fromFunctionOptionM(name, flow(f, I.succeed));
}

export const never: DataSource<unknown, any> = {
  identifier: "never",
  runAll: () => I.never
};

export const eqDataSource: Eq<DataSource<any, any>> = makeEq(
  (x, y) => x.identifier === y.identifier
);
