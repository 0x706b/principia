import type { Byte } from "@principia/core/Byte";
import type { Stream } from "@principia/core/Stream";
import type { Transform } from "stream";
import * as zlib from "zlib";

import type { TransformError } from "../stream";
import { transform } from "../stream";

function _transformZlib<O>(
  zipper: (options?: O) => Transform
): (options?: O) => <R, E>(stream: Stream<R, E, Byte>) => Stream<R, E | TransformError, Byte> {
  return (options) => transform(() => zipper(options));
}

export const gzip = _transformZlib(zlib.createGzip);

export const gunzip = _transformZlib(zlib.createGunzip);

export const deflate = _transformZlib(zlib.createDeflate);

export const inflate = _transformZlib(zlib.createInflate);

export const deflateRaw = _transformZlib(zlib.createDeflateRaw);

export const inflateRaw = _transformZlib(zlib.createInflateRaw);

export const brotliCompress = _transformZlib(zlib.createBrotliCompress);

export const brotliDecompress = _transformZlib(zlib.createBrotliDecompress);
