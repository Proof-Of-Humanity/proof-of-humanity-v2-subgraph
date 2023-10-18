import { BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";

export function hash(value: ByteArray): Bytes {
  return Bytes.fromByteArray(crypto.keccak256(value));
}

export function biToBytes(bi: BigInt, size: i32 = 32): Bytes {
  return Bytes.fromByteArray(
    size > bi.byteLength
      ? new ByteArray(size - bi.byteLength).concat(ByteArray.fromBigInt(bi))
      : ByteArray.fromBigInt(bi)
  );
}
