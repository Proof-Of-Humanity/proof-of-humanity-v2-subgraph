import {log, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  AccountRegistered,
  AccountsRemoved,
  TrustRenewed,
} from "../generated/ProofOfHumanityCirclesProxy/ProofOfHumanityCirclesProxy";
import { CirclesAccount, CrossChainRegistration, Registration } from "../generated/schema";

/**
 * Helper function to update a CirclesAccount's link to Humanity based on active local or cross-chain registrations.
 * Prioritizes local registration if both are active.
 */
export function updateCirclesAccountLink(
  circlesAccount: CirclesAccount, 
  humanityID: Bytes,
  currentTime: BigInt
): void {
  let registration = Registration.load(humanityID);
  let crossChainRegistration = CrossChainRegistration.load(humanityID);

  if (registration && registration.expirationTime.gt(currentTime)) {
    circlesAccount.humanity = humanityID;
    circlesAccount.trustExpiryTime = registration.expirationTime; 
  } else if (crossChainRegistration && crossChainRegistration.expirationTime.gt(currentTime)) {
    circlesAccount.humanity = humanityID;
    circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime; 
  }
}

export function handleAccountRegistered(event: AccountRegistered): void {
  log.info("handleAccountRegistered called: humanityID={} member={}", [
    event.params.humanityID.toHex(),
    event.params.account.toHex()
  ]);
  
  let circlesAccount = new CirclesAccount(event.params.account);
  updateCirclesAccountLink(circlesAccount, event.params.humanityID, event.block.timestamp);
  circlesAccount.save();
}

export function handleTrustRenewed(event: TrustRenewed): void {
  log.info("handleTrustRenewed called: humanityID={} account={}", [
    event.params.humanityID.toHex(),
    event.params.account.toHex()
  ]);

  let circlesAccount = CirclesAccount.load(event.params.account);
  if (!circlesAccount) {
    log.error("CirclesAccount entity not found for account={}", [event.params.account.toHex()]);
    return;
  }
  
  updateCirclesAccountLink(circlesAccount, event.params.humanityID, event.block.timestamp);
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
