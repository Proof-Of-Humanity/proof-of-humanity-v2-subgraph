import {log, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  AccountRegistered,
  AccountsRemoved,
  TrustRenewed,
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
      circlesAccount.crossChainRegistration = null;
    } else {
      circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime;
      circlesAccount.crossChainRegistration = crossChainRegistration.id;
      circlesAccount.registration = null;
    }
  } else if (registration) {
    // Only local registration exists
    circlesAccount.trustExpiryTime = registration.expirationTime;
    circlesAccount.registration = registration.id;
    circlesAccount.crossChainRegistration = null;
  } else if (crossChainRegistration) {
    // Only cross-chain registration exists
    circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime;
    circlesAccount.crossChainRegistration = crossChainRegistration.id;
    circlesAccount.registration = null;
  }
}

export function handleAccountRegistered(event: AccountRegistered): void {
  log.info("handleAccountRegistered called: humanityID={} member={}", [
    event.params.humanityID.toHex(),
    event.params.account.toHex()
  ]);
  
  let circlesAccount = new CirclesAccount(event.params.account);
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
export function handleAccountsRemoved(event: AccountsRemoved): void {
  const accounts = event.params.accounts;
  const zero = BigInt.fromI32(0);
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i];
    let circlesAccount = CirclesAccount.load(account);
    if(!circlesAccount) {
      log.error("CirclesAccount entity not found for account={}", [account.toHex()]);
      continue;
    }
    circlesAccount.trustExpiryTime = zero;
    circlesAccount.save();
  }
}
