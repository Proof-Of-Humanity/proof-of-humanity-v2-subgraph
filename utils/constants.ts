import { BigInt } from "@graphprotocol/graph-ts";
import { biToBytes } from "./misc";

export const ZERO = BigInt.fromI32(0);
export const ZERO_B = biToBytes(ZERO);
export const ONE = BigInt.fromI32(1);
export const ONE_B = biToBytes(ONE);
export const TWO = BigInt.fromI32(2);
export const TWO_B = biToBytes(TWO);
