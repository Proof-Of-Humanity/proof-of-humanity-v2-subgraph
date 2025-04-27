import {log } from "@graphprotocol/graph-ts";
import {
  MemberRegistered,
  TrustRenewed,
} from "../generated/ProofOfHumanityCirclesProxy/ProofOfHumanityCirclesProxy";
import { CirclesAccount, Registration } from "../generated/schema";

export function handleMemberRegistered(event: MemberRegistered): void {
    log.info("handleMemberRegistered called: humanityID={} member={}", [
      event.params.humanityID.toHex(),
      event.params.member.toHex()
    ]);
    const registration = Registration.load(event.params.humanityID);
    if (!registration) {
        log.error(
          "Registration entity not found for humanityID={}",
          [event.params.humanityID.toHex()]
        );
        return;
    }
    let circlesAccount = new CirclesAccount(event.params.member);
    circlesAccount.trustExpiryTime = registration.expirationTime;
    circlesAccount.humanity = event.params.humanityID;
    circlesAccount.save();
    log.info(
      "CirclesAccount created id={} for humanityID={} expires={}",
      [
        event.params.member.toHex(),
        event.params.humanityID.toHex(),
        registration.expirationTime.toString()
      ]
    );
}

export function handleTrustRenewed(event: TrustRenewed): void {
    log.info("handleTrustRenewed called: humanityID={} account={}", [
      event.params.humanityID.toHex(),
      event.params.account.toHex()
    ]);
    const registration = Registration.load(event.params.humanityID);
    if (!registration) {
        log.error(
          "Registration entity not found for humanityID={}",
          [event.params.humanityID.toHex()]
        );
        return;
    }
    const circlesAccount = CirclesAccount.load(event.params.account);
    if (!circlesAccount) {
        log.error(
          "CirclesAccount entity not found for account={}",
          [event.params.account.toHex()]
        );
        return;
    }
    circlesAccount.trustExpiryTime = registration.expirationTime;
    circlesAccount.save();
}