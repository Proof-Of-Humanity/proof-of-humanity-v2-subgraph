import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Challenge,
  Claimer,
  Contract,
  Contribution,
  Counter,
  Request,
  Round,
  Humanity,
} from "../generated/schema";
import {
  Party,
  Reason,
  Status,
  ZERO,
  ZERO_ADDRESS,
  ZERO_BI,
} from "./constants";
import { biToBytes, genId } from "./misc";

export function getContract(): Contract {
  let contract = Contract.load(ZERO);
  return contract == null ? New.Contract() : contract;
}

export function getCounter(): Counter {
  return Counter.load(ZERO) as Counter;
}

export class New {
  static Contract(): Contract {
    const contract = new Contract(ZERO);
    contract.address = ZERO_ADDRESS;
    contract.governor = ZERO_ADDRESS;
    contract.requestBaseDeposit = ZERO_BI;
    contract.humanityLifespan = ZERO_BI;
    contract.renewalTime = ZERO_BI;
    contract.challengePeriodDuration = ZERO_BI;
    contract.requiredNumberOfVouches = ZERO_BI;
    contract.sharedStakeMultiplier = ZERO_BI;
    contract.winnerStakeMultiplier = ZERO_BI;
    contract.loserStakeMultiplier = ZERO_BI;
    contract.metaEvidenceUpdates = ZERO_BI;
    contract.latestArbitratorData = ZERO;
    return contract;
  }

  static Humanity(id: Bytes): Humanity {
    const humanity = new Humanity(id);
    humanity.claimed = false;
    humanity.claimTime = ZERO_BI;
    humanity.expirationTime = ZERO_BI;
    humanity.vouching = false;
    humanity.pendingRevocation = false;
    humanity.nbRequests = ZERO_BI;
    humanity.nbPendingRequests = ZERO_BI;
    return humanity;
  }

  static Claimer(id: Bytes): Claimer {
    const claimer = new Claimer(id);
    claimer.hasHumanity = false;
    claimer.lastRequestTime = ZERO_BI;
    claimer.disputed = false;
    claimer.vouchesReceived = [];
    return claimer;
  }

  static Request(
    humanity: Bytes,
    claimer: Bytes,
    index: BigInt,
    revocation: boolean
  ): Request {
    const request = new Request(genId(humanity, biToBytes(index)));
    request.humanity = humanity;
    request.claimer = claimer;
    request.index = index;
    request.requester = ZERO_ADDRESS;
    request.revocation = revocation;
    request.status = revocation ? Status.Resolving : Status.Vouching;
    request.creationTime = ZERO_BI;
    request.resolutionTime = ZERO_BI;
    request.challengePeriodEnd = ZERO_BI;
    request.usedReasons = [];
    request.currentReason = Reason.None;
    request.ultimateChallenger = ZERO_ADDRESS;
    request.lastStatusChange = ZERO_BI;
    request.requesterLost = false;
    request.vouches = [];
    request.lastProcessedVouchIndex = ZERO_BI;
    request.arbitratorData = biToBytes(getContract().metaEvidenceUpdates);
    request.nbEvidence = ZERO_BI;
    request.nbChallenges = ZERO_BI;
    return request;
  }

  static Challenge(request: Bytes, index: BigInt): Challenge {
    const challenge = new Challenge(genId(request, biToBytes(index)));
    challenge.request = request;
    challenge.reason = Reason.None;
    challenge.challenger = ZERO_ADDRESS;
    challenge.creationTime = ZERO_BI;
    challenge.disputeId = ZERO_BI;
    challenge.ruling = Party.None;
    challenge.appealPeriodStart = ZERO_BI;
    challenge.appealPeriodEnd = ZERO_BI;
    challenge.nbRounds = ZERO_BI;
    return challenge;
  }

  static Round(challenge: Bytes, index: BigInt): Round {
    const round = new Round(genId(challenge, biToBytes(index)));
    round.challenge = challenge;
    round.creationTime = ZERO_BI;
    round.requesterFunds = ZERO_BI;
    round.challengerFunds = ZERO_BI;
    round.requesterPaid = false;
    round.challengerPaid = false;
    round.feeRewards = ZERO_BI;
    round.nbContributions = ZERO_BI;
    return round;
  }

  static Contribution(round: Bytes, contributor: Bytes): Contribution {
    const contribution = new Contribution(genId(round, contributor));
    contribution.round = round;
    contribution.contributor = contributor;
    contribution.forRequester = ZERO_BI;
    contribution.forChallenger = ZERO_BI;
    return contribution;
  }
}
