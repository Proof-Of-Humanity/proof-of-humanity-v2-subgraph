import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("0xa4AC94C4fa65Bb352eFa30e3408e64F72aC857bc")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);

export const ForesightRouterAddress = Address.fromBytes(
  Bytes.fromHexString("0xeC9048b59b3467415b1a38F63416407eA0c70fB8")
);

export const ForesightMarketAddress = Address.fromBytes(
  Bytes.fromHexString("0x6f7ae2815e7e13c14a6560f4b382ae78e7b1493e")
);
