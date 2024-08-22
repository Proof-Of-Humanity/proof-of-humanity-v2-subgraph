import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("0xECd1823b3087acEE3C77928b1959c08d31A8F20e")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);
