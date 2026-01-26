import { BigInt } from "@graphprotocol/graph-ts";
import { DailyAnalytics, GlobalAnalytics } from "../generated/schema";
import { ONE, ZERO } from "./constants";

export const GLOBAL_ANALYTICS_ID = "global";

export function getGlobalAnalytics(): GlobalAnalytics {
  let analytics = GlobalAnalytics.load(GLOBAL_ANALYTICS_ID);
  if (analytics == null) {
    analytics = new GlobalAnalytics(GLOBAL_ANALYTICS_ID);
    analytics.verifiedHumanProfiles = ZERO;
    analytics.airdropClaims = ZERO;
    analytics.registrationsPending = ZERO;
    analytics.registrationsFunded = ZERO;
    analytics.registrationsChallenged = ZERO;
    analytics.registrationsRejected = ZERO;
    analytics.registrationsSubmitted = ZERO;
    analytics.registrationsBridged = ZERO;
    analytics.registrationsTransferredOut = ZERO;
    analytics.registrationsWithdrawn = ZERO;
    analytics.renewalsSubmitted = ZERO;
    analytics.save();
  }
  return analytics;
}

export function getDailyAnalytics(timestamp: BigInt): DailyAnalytics {
  const dayId = timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400));
  let analytics = DailyAnalytics.load(dayId.toString());
  if (analytics == null) {
    analytics = new DailyAnalytics(dayId.toString());
    analytics.date = dayId;
    analytics.verifiedHumanProfiles = ZERO;
    analytics.airdropClaims = ZERO;
    analytics.registrationsPending = ZERO;
    analytics.registrationsFunded = ZERO;
    analytics.registrationsChallenged = ZERO;
    analytics.registrationsRejected = ZERO;
    analytics.registrationsSubmitted = ZERO;
    analytics.registrationsBridged = ZERO;
    analytics.registrationsWithdrawn = ZERO;
    analytics.renewalsSubmitted = ZERO;
    analytics.save();
  }
  return analytics;
}

export class AnalyticsUtil {
  // Called when: ClaimRequest (new claim submission)
  static onClaimSubmitted(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsSubmitted = global.registrationsSubmitted.plus(ONE);
    global.registrationsPending = global.registrationsPending.plus(ONE);
    
    daily.registrationsSubmitted = daily.registrationsSubmitted.plus(ONE);
    daily.registrationsPending = daily.registrationsPending.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: RenewalRequest (renewal submission)
  static onRenewalSubmitted(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.renewalsSubmitted = global.renewalsSubmitted.plus(ONE);
    global.registrationsPending = global.registrationsPending.plus(ONE);
    
    daily.renewalsSubmitted = daily.renewalsSubmitted.plus(ONE);
    daily.registrationsPending = daily.registrationsPending.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: StateAdvanced (non-revocation)
  // Vouching → Resolving
  static onFunded(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsPending = global.registrationsPending.minus(ONE);
    global.registrationsFunded = global.registrationsFunded.plus(ONE);
    
    daily.registrationsFunded = daily.registrationsFunded.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: RequestChallenged (non-revocation)
  // Resolving → Disputed
  static onChallenged(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsFunded = global.registrationsFunded.minus(ONE);
    global.registrationsChallenged = global.registrationsChallenged.plus(ONE);
    
    daily.registrationsChallenged = daily.registrationsChallenged.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: ChallengePeriodRestart (non-revocation)
  // Disputed → Resolving (requester won but not terminal)
  static onChallengeRestarted(): void {
    const global = getGlobalAnalytics();

    global.registrationsChallenged = global.registrationsChallenged.minus(ONE);
    global.registrationsFunded = global.registrationsFunded.plus(ONE);

    global.save();
  }

  // Called when: HumanityClaimed (non-revocation, from Resolving state)
  // Resolving → Verified (unchallenged path)
  static onVerifiedUnchallenged(timestamp: BigInt, isRenewal: boolean): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsFunded = global.registrationsFunded.minus(ONE);

    // Only increment verified count for NEW claims (not renewals)
    if (!isRenewal) {
      global.verifiedHumanProfiles = global.verifiedHumanProfiles.plus(ONE);
      daily.verifiedHumanProfiles = daily.verifiedHumanProfiles.plus(ONE);
    }

    global.save();
    daily.save();
  }

  // Called when: Ruling + HumanityClaimed (terminal requester win after dispute)
  // Disputed → Verified (challenged path, requester wins)
  static onVerifiedChallenged(timestamp: BigInt, isRenewal: boolean): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsChallenged = global.registrationsChallenged.minus(ONE);

    // Only increment verified count for NEW claims (not renewals)
    if (!isRenewal) {
      global.verifiedHumanProfiles = global.verifiedHumanProfiles.plus(ONE);
      daily.verifiedHumanProfiles = daily.verifiedHumanProfiles.plus(ONE);
    }

    global.save();
    daily.save();
  }

  // Called when: Ruling (terminal, non-revocation, challenger/none wins)
  // Disputed → Rejected
  static onRejected(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsChallenged = global.registrationsChallenged.minus(ONE);
    global.registrationsRejected = global.registrationsRejected.plus(ONE);
    
    daily.registrationsRejected = daily.registrationsRejected.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: RequestWithdrawn (non-revocation, from Vouching)
  static onWithdrawnFromVouching(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.registrationsPending = global.registrationsPending.minus(ONE);
    global.registrationsWithdrawn = global.registrationsWithdrawn.plus(ONE);
    
    daily.registrationsWithdrawn = daily.registrationsWithdrawn.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: HumanityRevoked, HumanityDischargedDirectly
  static onRevoked(): void {
    const global = getGlobalAnalytics();
    global.verifiedHumanProfiles = global.verifiedHumanProfiles.minus(ONE);
    global.save();
  }

  // Called when: HumanityGrantedDirectly (direct grant, bypasses queue)
  static onDirectGrant(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.verifiedHumanProfiles = global.verifiedHumanProfiles.plus(ONE);
    daily.verifiedHumanProfiles = daily.verifiedHumanProfiles.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: TransferReceived (bridged profile)
  static onBridged(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    // Bridged profiles are direct grants, so verified increases
    // But we also want to track them as bridged specifically
    global.registrationsBridged = global.registrationsBridged.plus(ONE);
    daily.registrationsBridged = daily.registrationsBridged.plus(ONE);

    global.save();
    daily.save();
  }

  // Called when: TransferInitiated (outbound transfer)
  static onTransferredOut(): void {
    const global = getGlobalAnalytics();
    global.registrationsTransferredOut =
      global.registrationsTransferredOut.plus(ONE);
    global.save();
  }

  // Called when: HumanityClaimed (new claim only, not renewal)
  static onAirdropClaimed(timestamp: BigInt): void {
    const global = getGlobalAnalytics();
    const daily = getDailyAnalytics(timestamp);

    global.airdropClaims = global.airdropClaims.plus(ONE);
    daily.airdropClaims = daily.airdropClaims.plus(ONE);

    global.save();
    daily.save();
  }
}
