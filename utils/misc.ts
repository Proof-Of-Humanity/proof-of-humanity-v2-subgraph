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

export function biToBytesReversed(bi: BigInt, size: i32 = 32, zeroesFill: boolean = true): Bytes {
  const cctt = zeroesFill? 0 : 255; // fill with 00 or ff (hexa)
  return Bytes.fromByteArray(
    size > bi.byteLength
      ? ((new ByteArray(size - bi.byteLength)).fill(cctt) as ByteArray).concat(ByteArray.fromBigInt(bi))
      : ByteArray.fromBigInt(bi)
  );
}
