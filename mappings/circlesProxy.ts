import { log } from "@graphprotocol/graph-ts";
import {
  AccountRegistered,
  TrustRenewed,
  TrustReEvaluationBatchProcessed,
  TrustReEvaluationCompleted,
} from "../generated/ProofOfHumanityCirclesProxy/ProofOfHumanityCirclesProxy";
import { CirclesAccount, Humanity } from "../generated/schema";

export function handleAccountRegistered(event: AccountRegistered): void {
  log.info(
    "handleAccountRegistered called: humanityID={} account={} humanityExpirationTime={} trustExpiryTime={}",
    [
      event.params.humanityID.toHex(),
      event.params.account.toHex(),
      event.params.humanityExpirationTime.toString(),
      event.params.trustExpiryTime.toString(),
    ]
  );

  let circlesAccount = CirclesAccount.load(event.params.account);
  if (circlesAccount == null) {
    circlesAccount = new CirclesAccount(event.params.account);
  }
  circlesAccount.trustExpiryTime = event.params.trustExpiryTime;

  let humanity = Humanity.load(event.params.humanityID);
  if (humanity) {
    humanity.circleAccount = circlesAccount.id;
    humanity.save();
  } else {
    log.error("Humanity entity not found for humanityID={}", [
      event.params.humanityID.toHex(),
    ]);
    return;
  }
  circlesAccount.save();
}

export function handleTrustRenewed(event: TrustRenewed): void {
  log.info(
    "handleTrustRenewed called: humanityID={} account={} newTrustExpiryTime={}",
    [
      event.params.humanityID.toHex(),
      event.params.account.toHex(),
      event.params.newTrustExpiryTime.toString()
    ]
  );

  let circlesAccount = CirclesAccount.load(event.params.account);
  if (!circlesAccount) {
    log.error("CirclesAccount entity not found for account={}", [
      event.params.account.toHex(),
    ]);
    return;
  }
  circlesAccount.trustExpiryTime = event.params.newTrustExpiryTime;
  circlesAccount.save();
}

export function handleTrustReEvaluationCompleted(
  event: TrustReEvaluationCompleted
): void {
  log.info("handleTrustReEvaluationCompleted called: account={} expirationTime={}", [
    event.params.account.toHex(),
    event.params.expirationTime.toString(),
  ]);

  let circlesAccount = CirclesAccount.load(event.params.account);
  if (!circlesAccount) {
    log.error("CirclesAccount entity not found for account={}", [
      event.params.account.toHex(),
    ]);
    return;
  }

  circlesAccount.trustExpiryTime = event.params.expirationTime;
  circlesAccount.save();
}

export function handleTrustReEvaluationBatchProcessed(
  event: TrustReEvaluationBatchProcessed
): void {
  log.info(
    "handleTrustReEvaluationBatchProcessed called: account={} currentIndex={} length={}",
    [
      event.params.account.toHex(),
      event.params.currentIndex.toString(),
      event.params.length.toString(),
    ]
  );
}
