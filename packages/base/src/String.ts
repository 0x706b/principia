import type { NonEmptyArray } from './NonEmptyArray'

import * as A from './Array'
import { flow, identity, pipe } from './Function'
import * as G from './Guard'
import * as NA from './NonEmptyArray'
import * as N from './Number'
import * as O from './Option'
import { max_ } from './Ord'
import * as P from './typeclass'

/**
 * The empty string
 */
export const empty = ''

/**
 * Converts a number into a string
 */
export function fromNumber(x: number): string {
  return String(x)
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

/**
 * Check if a value is a string
 */
export function isString(u: unknown): u is string {
  return typeof u === 'string'
}

/**
 * Check is a string is empty
 */
export function isEmpty(s: string): boolean {
  return s === ''
}

/**
 * Check is a string is non-empty
 */
export function isNonEmpty(s: string): boolean {
  return s !== ''
}

/**
 * Check if a string contains the given substring
 */
export function contains_(s: string, substr: string): boolean {
  return s.includes(substr)
}

/**
 * Check if a string contains the given substring
 */
export function contains(substr: string): (s: string) => boolean {
  return (s) => s.includes(substr)
}

/**
 * Check if a string starts with the given substring
 */
export function startsWith_(s: string, substr: string): boolean {
  return s.startsWith(substr)
}

/**
 * Check if a string starts with the given substring
 */
export function startsWith(substr: string): (s: string) => boolean {
  return (s) => startsWith_(s, substr)
}

/**
 * Check if a string ends with the given substring
 */
export function endsWith_(s: string, substr: string): boolean {
  return s.endsWith(substr)
}

/**
 * Check if a string ends with the given substring
 */
export function endsWith(substr: string): (s: string) => boolean {
  return (s) => endsWith_(s, substr)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Trim whitespace from both sides of a string
 */
export function trim(s: string): string {
  return s.trim()
}

/**
 * Trim whitespace from the left side of the string
 */
export function trimLeft(s: string): string {
  return s.trimLeft()
}

/**
 * Trim whitespace from the right side of the string
 */
export function trimRight(s: string): string {
  return s.trimRight()
}

/**
 * Prepend one string to another
 */
export function prepend_(s: string, prepend: string): string {
  return prepend + s
}

/**
 * Prepend one string to another
 */
export function prepend(prepend: string): (s: string) => string {
  return (s) => prepend + s
}

/**
 * Removes the given string from the beginning, if it exists
 */
export function unprepend_(s: string, s1: string): string {
  return s.startsWith(s1) ? s.substr(s1.length) : s
}

/**
 * Removes the given string from the beginning, if it exists
 */
export function unprepend(s1: string): (s: string) => string {
  return (s) => unprepend_(s, s1)
}

/**
 * Append one string to another.
 */
export function append_(s: string, x: string): string {
  return s + x
}

/**
 * Append one string to another.
 */
export function append(x: string): (s: string) => string {
  return (s) => s + x
}

/**
 * Remove the end of a string, if it exists.
 */
export function unappend_(s: string, x: string): string {
  return s.endsWith(x) ? s.substring(0, s.lastIndexOf(x)) : s
}

/**
 * Remove the end of a string, if it exists.
 */
export function unappend(x: string): (s: string) => string {
  return (s) => unappend_(s, x)
}

/**
 * Surround a string. Equivalent to calling `prepend` and `append` with the
 * same outer value.
 */
export function surround_(s: string, x: string): string {
  return pipe(s, prepend(x), append(x))
}

/**
 * Surround a string. Equivalent to calling `prepend` and `append` with the
 * same outer value.
 */
export function surround(x: string): (s: string) => string {
  return (s) => surround_(s, x)
}

/**
 * Remove the start and end of a string, if they both exist.
 */
export function unsurround_(s: string, x: string): string {
  return s.startsWith(x) && s.endsWith(x) ? pipe(s, unprepend(x), unappend(x)) : s
}

/**
 * Remove the start and end of a string, if they both exist.
 */
export function unsurround(x: string): (s: string) => string {
  return (s) => unsurround_(s, x)
}

/**
 * Returns the substring between the start index (inclusive) and the end index
 * (exclusive).
 */
export function slice_(s: string, start: number, end: number): string {
  return s.slice(start, end)
}

/**
 * Returns the substring between the start index (inclusive) and the end index
 * (exclusive).
 */
export function slice(start: number, end: number): (s: string) => string {
  return (s) => s.slice(start, end)
}

/**
 * Keep the specified number of characters from the start of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 */
export function takeLeft_(s: string, n: number): string {
  return s.slice(0, max_(N.Ord)(0, n))
}

/**
 * Keep the specified number of characters from the start of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 */
export function takeLeft(n: number): (s: string) => string {
  return (s) => takeLeft_(s, n)
}

/**
 * Keep the specified number of characters from the end of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 */
export function takeRight_(s: string, n: number): string {
  return s.slice(max_(N.Ord)(0, s.length - Math.floor(n)), Infinity)
}

/**
 * Keep the specified number of characters from the end of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 */
export function takeRight(n: number): (s: string) => string {
  return (s) => takeRight_(s, n)
}

/**
 * Match a string with a RegExp
 */
export function match_(s: string, r: RegExp): O.Option<RegExpMatchArray> {
  return O.fromNullable(s.match(r))
}

/**
 * Match a string with a RegExp
 */
export function match(r: RegExp): (s: string) => O.Option<RegExpMatchArray> {
  return (s) => match_(s, r)
}

/**
 * Match a string with a global RegExp
 */
export function matchAll_(s: string, r: RegExp): O.Option<NonEmptyArray<RegExpMatchArray>> {
  return O.bind_(
    O.tryCatch(() => s.matchAll(r)),
    flow(A.from, NA.fromArray)
  )
}

/**
 * Matches a string with a global RegExp
 */
export function matchAll(r: RegExp): (s: string) => O.Option<NonEmptyArray<RegExpMatchArray>> {
  return (s) => matchAll_(s, r)
}

/**
 * Split a string into substrings using the specified separator and return them
 * as an array.
 */
export function split_(s: string, on: string | RegExp): ReadonlyArray<string> {
  return s.split(on)
}

/**
 * Split a string into substrings using the specified separator and return them
 * as an array.
 */
export function split(on: string | RegExp): (s: string) => ReadonlyArray<string> {
  return (s) => s.split(on)
}

/**
 * Apply an endomorphism upon an array of characters against a string.
 * This is useful as it allows you to run many polymorphic functions targeting
 * arrays against strings without having to rewrite them.
 */
export function under_(s: string, f: (chars: ReadonlyArray<string>) => ReadonlyArray<string>): string {
  return pipe(s, split(''), f, A.join(''))
}

/**
 * Apply an endomorphism upon an array of characters against a string.
 * This is useful as it allows you to run many polymorphic functions targeting
 * arrays against strings without having to rewrite them.
 */
export function under(f: (chars: ReadonlyArray<string>) => ReadonlyArray<string>): (s: string) => string {
  return (s) => under_(s, f)
}

/**
 * Reverse a string
 */
export function reverse(s: string): string {
  return under_(s, A.reverse)
}

/**
 * Split a string into substrings using any recognised newline as the separator.
 */
export function lines(s: string): ReadonlyArray<string> {
  return split_(s, /\r\n|\r|\n/)
}

/**
 * Join newline-separated strings together.
 */
export function unlines(as: ReadonlyArray<string>): string {
  return A.join_(as, '\n')
}

/**
 * Test a string with a RegExp
 */
export function test_(s: string, r: RegExp): boolean {
  return r.test(s)
}

/**
 * Test a string with a RegExp
 */
export function test(r: RegExp): (s: string) => boolean {
  return (s) => r.test(s)
}

/**
 * Replace the first (or all, with a global RegExp) occurrence of a matched substring with a replacement.
 */
export function replace_(s: string, test: string | RegExp, r: string): string {
  return s.replace(test, r)
}

/**
 * Replace the first (or all, with a global RegExp) occurrence of a matched substring with a replacement.
 */
export function replace(test: string | RegExp, r: string): (s: string) => string {
  return (s) => s.replace(test, r)
}

/**
 * Capitalize the first letter of the string
 */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Capitalize the first letter of every word in a string
 */
export function capitalizeAll(s: string): string {
  return pipe(s, split(' '), A.map(capitalize), A.join(' '))
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Eq: P.Eq<string> = P.makeEq((x, y) => x === y)

export const Semigroup: P.Semigroup<string> = P.makeSemigroup((x, y) => x + y)

export const Monoid: P.Monoid<string> = {
  ...Semigroup,
  nat: empty
}

export const Ord: P.Ord<string> = P.makeOrd((x, y) => (x < y ? -1 : x > y ? 1 : 0))

export const Show: P.Show<string> = P.makeShow(identity)

export const Guard: G.Guard<unknown, string> = G.makeGuard((u: unknown): u is string => typeof u === 'string')
