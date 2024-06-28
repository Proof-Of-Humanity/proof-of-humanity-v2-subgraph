import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("0x0D4674De96459e00A101656b799ba016fBc45dC1")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);
