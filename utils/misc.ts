import { BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";
import { ZERO_B } from "./constants";

export function hash(value: ByteArray): Bytes {
  return Bytes.fromByteArray(crypto.keccak256(value));
}

export function biToBytes(bi: BigInt): Bytes {
  return bi.isZero() ? ZERO_B : Bytes.fromByteArray(ByteArray.fromBigInt(bi));
}

export function i32ToBytes(nb: i32): Bytes {
  return nb == 0 ? ZERO_B : Bytes.fromByteArray(ByteArray.fromI32(nb));
}
