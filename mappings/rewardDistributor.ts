import { Claimed, RewardDistributor } from "../generated/RewardDistributor/RewardDistributor";
import { RewardClaim } from "../generated/schema";
import { Factory } from "../utils";

export function handleClaimed(event: Claimed): void {
  // Create RewardClaim entity using humanityID as ID since each humanity can only claim once
  const claim = new RewardClaim(event.params.humanityID);
  
  // Bind to contract to get the amount per claim
  const contract = RewardDistributor.bind(event.address);
  const amountPerClaim = contract.amountPerClaim();

  claim.humanityID = event.params.humanityID;
  claim.amount = amountPerClaim;
  claim.timestamp = event.block.timestamp;
  
  const claimer = Factory.Claimer(event.transaction.from, null);
  claimer.save();
  claim.claimer = claimer.id;
  
  claim.save();
}
