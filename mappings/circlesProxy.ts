import {log } from "@graphprotocol/graph-ts";
import {
  MemberRegistered,
  TrustRenewed,
} from "../generated/ProofOfHumanityCirclesProxy/ProofOfHumanityCirclesProxy";
import { CirclesAccount, CrossChainRegistration, Registration } from "../generated/schema";

export function handleMemberRegistered(event: MemberRegistered): void {

    log.info("handleMemberRegistered called: humanityID={} member={}", [
      event.params.humanityID.toHex(),
      event.params.member.toHex()
    ]);
    let circlesAccount = new CirclesAccount(event.params.member);
    let registration = Registration.load(event.params.humanityID);

    if (registration) {
        circlesAccount.trustExpiryTime = registration.expirationTime;
        circlesAccount.registration = registration.id;
    } else {
        let crossChainRegistration = CrossChainRegistration.load(event.params.humanityID);
        if (crossChainRegistration) {
            circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime;
            circlesAccount.crossChainRegistration = crossChainRegistration.id;
        }
    }
    circlesAccount.save();
}

export function handleTrustRenewed(event: TrustRenewed): void {
    let circlesAccount = CirclesAccount.load(event.params.account);
    if(!circlesAccount) {
        log.error("CirclesAccount entity not found for account={}", [event.params.account.toHex()]);
        return;
    }
    let registration = Registration.load(event.params.humanityID);

    if (registration) {
        circlesAccount.trustExpiryTime = registration.expirationTime;
        circlesAccount.registration = registration.id;
    } else {
        let crossChainRegistration = CrossChainRegistration.load(event.params.humanityID);
        if (crossChainRegistration) {
            circlesAccount.trustExpiryTime = crossChainRegistration.expirationTime;
            circlesAccount.crossChainRegistration = crossChainRegistration.id;
        }
    }
    circlesAccount.save();
}