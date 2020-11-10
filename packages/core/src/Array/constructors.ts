/*
 * -------------------------------------------
 * Array Constructors
 * -------------------------------------------
 */

/**
 * empty :: <a>() -> Array a
 *
 * A function that returns a type-safe empty Array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const empty = <A>(): ReadonlyArray<A> => [];

/**
 * fromArray :: MutableArray a -> Array a
 *
 * Constructs a new readonly array from a standard array.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromArray<A>(as: Array<A>): ReadonlyArray<A> {
   return Array.from(as);
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const makeBy = <A>(n: number, f: (i: number) => A): ReadonlyArray<A> => {
   const r: Array<A> = [];
   for (let i = 0; i < n; i++) {
      r.push(f(i));
   }
   return r;
};

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @category Constructors
 * @since 1.0.0
 */
export const range = (start: number, end: number): ReadonlyArray<number> => makeBy(end - start + 1, (i) => start + i);

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @category Constructors
 * @since 1.0.0
 */
export const replicate = <A>(n: number, a: A): ReadonlyArray<A> => makeBy(n, () => a);
