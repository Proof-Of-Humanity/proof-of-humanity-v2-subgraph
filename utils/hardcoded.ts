import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("0x6cbEdC1920090EA4F28A38C1CD61c8D37b2cc323")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);
