import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Challenge,
  Claimer,
  Contract,
  Contribution,
  Request,
  Round,
  Humanity,
  RequesterFund,
  ChallengerFund,
  Registration,
} from "../generated/schema";
import { ZERO_B, ZERO, ONE_B, TWO_B } from "./constants";
import { biToBytes, hash } from "./misc";
import { PartyUtil, ReasonUtil, StatusUtil } from "./enums";

const LEGACY_FLAG = Bytes.fromUTF8("legacy");

export function getContract(): Contract {
  let contract = Contract.load(ZERO_B);
  return contract == null ? new Contract(ZERO_B) : contract;
}

export class Factory {
  static Humanity(id: Bytes): Humanity {
    let humanity = Humanity.load(id);
    if (humanity == null) {
      humanity = new Humanity(id);
      humanity.vouching = false;
      humanity.pendingRevocation = false;
      humanity.nbRequests = ZERO;
      humanity.nbLegacyRequests = ZERO;
      humanity.nbPendingRequests = ZERO;
    }
    return humanity;
  }

  static Claimer(account: Address, name: string | null): Claimer {
    let claimer = Claimer.load(account);
    if (claimer == null) {
      claimer = new Claimer(account);
      claimer.nbVouchesReceived = ZERO;
      claimer.name = name;
    }
    return claimer;
  }

  static Registration(pohId: Bytes, claimer: Address): Registration {
    let registration = Registration.load(pohId);
    if (registration == null) {
      registration = new Registration(pohId);
      registration.humanity = pohId;
      registration.claimer = claimer;
    }
    return registration;
  }

  static Request(
    humanity: Bytes,
    claimer: Bytes,
    index: BigInt,
    revocation: boolean,
    legacy: boolean
  ): Request {
    const requestId = legacy
      ? hash(hash(humanity.concat(biToBytes(index))).concat(LEGACY_FLAG))
      : hash(humanity.concat(biToBytes(index)));
    let request = Request.load(requestId);
    if (request == null) {
      request = new Request(requestId);
      request.humanity = humanity;
      request.legacy = legacy;
      request.claimer = claimer;
      request.index = index;
      request.requester = revocation ? Address.zero() : claimer;
      request.revocation = revocation;
      request.status = revocation ? StatusUtil.resolving : StatusUtil.vouching;
      request.creationTime = ZERO;
      request.resolutionTime = ZERO;
      request.challengePeriodEnd = ZERO;
      request.ultimateChallenger = Address.zero();
      request.lastStatusChange = ZERO;
      request.arbitratorHistory = getContract()
        .latestArbitratorHistory as string;
      request.nbChallenges = ZERO;
      request.contributors = [];
    }
    return request;
  }

  static Challenge(requestId: Bytes, index: BigInt): Challenge {
    const challengeId = hash(requestId.concat(biToBytes(index)));
    let challenge = Challenge.load(challengeId);
    if (challenge == null) {
      challenge = new Challenge(challengeId);
      challenge.index = index;
      challenge.request = requestId;
      challenge.reason = ReasonUtil.none;
      challenge.challenger = Address.zero();
      challenge.creationTime = ZERO;
      challenge.disputeId = ZERO;
      challenge.ruling = PartyUtil.none;
      challenge.nbRounds = ZERO;
    }
    return challenge;
  }

  static Round(challengeId: Bytes, index: BigInt): Round {
    const roundId = hash(challengeId.concat(biToBytes(index)));
    let round = Round.load(roundId);
    if (round == null) {
      round = new Round(roundId);
      round.index = index;
      round.challenge = challengeId;
      round.creationTime = ZERO;

      const requesterFund = Factory.RequesterFund(roundId);
      round.requesterFund = requesterFund.id;

      const challengerFund = Factory.ChallengerFund(roundId);
      round.challengerFund = challengerFund.id;
    }
    return round;
  }

  static RequesterFund(roundId: Bytes): RequesterFund {
    const fundId = hash(roundId.concat(ONE_B));
    let fund = RequesterFund.load(fundId);
    if (fund == null) {
      fund = new RequesterFund(fundId);
      fund.amount = ZERO;
      fund.feeRewards = ZERO;

      const round = Round.load(roundId) as Round;
      round.requesterFund = fundId;
      round.save();
    }
    return fund;
  }

  static ChallengerFund(roundId: Bytes): ChallengerFund {
    const fundId = hash(roundId.concat(TWO_B));
    let fund = ChallengerFund.load(fundId);
    if (fund == null) {
      fund = new ChallengerFund(fundId);
      fund.amount = ZERO;
      fund.feeRewards = ZERO;

      const round = Round.load(roundId) as Round;
      round.challengerFund = fundId;
      round.save();
    }
    return fund;
  }

  static Contribution(fundId: Bytes, contributor: Bytes): Contribution {
    let contribution = new Contribution(hash(fundId.concat(contributor)));
    if (contribution == null) {
      contribution = new Contribution(hash(fundId.concat(contributor)));
      contribution.contributor = contributor;
      contribution.amount = ZERO;
    }
    return contribution;
  }
}
