import {log, Bytes, store, BigInt } from "@graphprotocol/graph-ts";
import {
  MemberRegistered,
  TrustRenewed,
  MembersRemoved
} from "../generated/ProofOfHumanityCirclesProxy/ProofOfHumanityCirclesProxy";
import { CirclesAccount, CrossChainRegistration, Registration } from "../generated/schema";

/**
 * Helper function to update a CirclesAccount with the registration having the latest expiration time
 */
function updateCirclesAccountFromRegistrations(
  circlesAccount: CirclesAccount, 
  humanityID: Bytes
): void {
  let registration = Registration.load(humanityID);
  let crossChainRegistration = CrossChainRegistration.load(humanityID);

  if (registration && crossChainRegistration) {
    // If both exist, use the one with the later expiration time
    if (registration.expirationTime > crossChainRegistration.expirationTime) {
      circlesAccount.trustExpiryTime = registration.expirationTime;
      circlesAccount.registration = registration.id;
    } else {
      circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime;
      circlesAccount.crossChainRegistration = crossChainRegistration.id;
    }
  } else if (registration) {
    // Only local registration exists
    circlesAccount.trustExpiryTime = registration.expirationTime;
    circlesAccount.registration = registration.id;
  } else if (crossChainRegistration) {
    // Only cross-chain registration exists
    circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime;
    circlesAccount.crossChainRegistration = crossChainRegistration.id;
  }
}

export function handleMemberRegistered(event: MemberRegistered): void {
  log.info("handleMemberRegistered called: humanityID={} member={}", [
    event.params.humanityID.toHex(),
    event.params.member.toHex()
  ]);
  
  let circlesAccount = new CirclesAccount(event.params.member);
  updateCirclesAccountFromRegistrations(circlesAccount, event.params.humanityID);
  circlesAccount.save();
}

export function handleTrustRenewed(event: TrustRenewed): void {
  let circlesAccount = CirclesAccount.load(event.params.account);
  if (!circlesAccount) {
    log.error("CirclesAccount entity not found for account={}", [event.params.account.toHex()]);
    return;
  }
  
  updateCirclesAccountFromRegistrations(circlesAccount, event.params.humanityID);
  circlesAccount.save();
}
