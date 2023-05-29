import { BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";
import { ZERO } from "./constants";

// function concatByteArrays(a: ByteArray, b: ByteArray): ByteArray {
//   const tmp = new Uint8Array(a.byteLength + b.byteLength);
//   tmp.set(a, 0);
//   tmp.set(b, a.byteLength);
//   return Bytes.fromUint8Array(tmp);
// }

// export function hashFromStrings(a: string, b: string): string {
//   return crypto
//     .keccak256(concatByteArrays(Bytes.fromUTF8(a), Bytes.fromUTF8(b)))
//     .toHexString();
// }

// export function hashFromStringsWithSuffix(
//   a: string,
//   b: string,
//   s: string
// ): string {
//   return crypto
//     .keccak256(
//       concatByteArrays(
//         concatByteArrays(Bytes.fromUTF8(a), Bytes.fromUTF8(b)),
//         Bytes.fromUTF8(s)
//       )
//     )
//     .toHexString();
// }

export function biToBytes(bi: BigInt): Bytes {
  return bi.isZero() ? ZERO : Bytes.fromByteArray(ByteArray.fromBigInt(bi));
}

export function i32ToBytes(nb: i32): Bytes {
  return nb == 0 ? ZERO : Bytes.fromByteArray(ByteArray.fromI32(nb));
}

export function genId(a: Bytes, b: Bytes): Bytes {
  return Bytes.fromByteArray(crypto.keccak256(a.concat(b)));
}

export function genId3(a: Bytes, b: Bytes, c: Bytes): Bytes {
  return Bytes.fromByteArray(crypto.keccak256(a.concat(b).concat(c)));
}
