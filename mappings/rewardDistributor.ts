import { Claimed, RewardDistributor } from "../generated/RewardDistributor/RewardDistributor";
import { RewardClaim } from "../generated/schema";
import { Factory } from "../utils";
import { log } from "@graphprotocol/graph-ts";

export function handleClaimed(event: Claimed): void {
  // Create RewardClaim entity using humanityID as ID since each humanity can only claim once
  const claim = new RewardClaim(event.params.humanityID);
  
  log.info(
    "RewardDistributor.handleClaimed start address={} humanityID={} txFrom={} block={} ts={}",
    [
      event.address.toHex(),
      event.params.humanityID.toHex(),
      event.transaction.from.toHex(),
      event.block.number.toString(),
      event.block.timestamp.toString(),
    ]
  );
  
  // Bind to contract to get the amount per claim
  const contract = RewardDistributor.bind(event.address);
  const amountPerClaim = contract.amountPerClaim();
  log.info("RewardDistributor.handleClaimed amountPerClaim={}", [
    amountPerClaim.toString(),
  ]);
  claim.amount = amountPerClaim;
  claim.timestamp = event.block.timestamp;
  
  const claimer = Factory.Claimer(event.transaction.from, null);
  claimer.save();
  claim.claimer = claimer.id;
  
  log.info(
    "RewardDistributor.handleClaimed prepared claimId={} claimer={} amount={} ts={}",
    [
      claim.id.toHex(),
      claimer.id.toHex(),
      claim.amount.toString(),
      claim.timestamp.toString(),
    ]
  );
  
  claim.save();
  log.info("RewardDistributor.handleClaimed saved RewardClaim id={}", [
    claim.id.toHex(),
  ]);
}
