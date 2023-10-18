import { Address, BigInt, ByteArray, Bytes } from "@graphprotocol/graph-ts";
import {
  Claimer,
  Contract,
  Request,
  Humanity,
  Registration,
  EvidenceGroup,
} from "../generated/schema";
import { ZERO, ONE } from "./constants";
import { biToBytes, hash } from "./misc";
import { StatusUtil } from "./enums";

export const LEGACY_FLAG = Bytes.fromUTF8("legacy");

export function getContract(): Contract {
  let contract = Contract.load(new Bytes(1));
  if (contract == null) {
    contract = new Contract(new Bytes(1));
    contract.humanityLifespan = ZERO;
    contract.renewalPeriodDuration = ZERO;
    contract.challengePeriodDuration = ZERO;
    contract.requiredNumberOfVouches = ZERO;
    contract.baseDeposit = ZERO;
  }
  return contract;
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

  static Request(pohId: Bytes, index: BigInt): Request {
    let requestId: Bytes;
    let evGroupId: Bytes;

    if (index.ge(ZERO)) {
      requestId = hash(pohId.concat(biToBytes(index)));
      evGroupId = hash(
        ByteArray.fromHexString(pohId.toHex())
          .concat(new ByteArray(32 - index.byteLength))
          .concat(ByteArray.fromBigInt(index))
      );
      let evidenceGroup = EvidenceGroup.load(evGroupId);
      if (evidenceGroup == null) {
        evidenceGroup = new EvidenceGroup(evGroupId);
        evidenceGroup.length = ZERO;
        evidenceGroup.save();
      }
    } else {
      requestId = hash(
        pohId.concat(biToBytes(index.plus(ONE).abs())).concat(LEGACY_FLAG)
      );
      evGroupId = biToBytes(
        index
          .plus(ONE)
          .abs()
          .plus(BigInt.fromByteArray(pohId)),
        20
      );
      let evidenceGroup = EvidenceGroup.load(evGroupId);
      if (evidenceGroup == null) {
        evidenceGroup = new EvidenceGroup(evGroupId);
        evidenceGroup.length = ZERO;
        evidenceGroup.save();
      }
    }

    let request = Request.load(requestId);
    if (request == null) {
      request = new Request(requestId);
      request.humanity = pohId;
      request.claimer = Address.zero();
      request.index = index;
      request.requester = Address.zero();
      request.revocation = false;
      request.status = StatusUtil.vouching;
      request.creationTime = ZERO;
      request.resolutionTime = ZERO;
      request.challengePeriodEnd = ZERO;
      request.ultimateChallenger = Address.zero();
      request.lastStatusChange = ZERO;
      request.arbitratorHistory = getContract()
        .latestArbitratorHistory as string;
      request.nbChallenges = ZERO;
      request.contributors = [];
      request.evidenceGroup = evGroupId;
    }
    return request;
  }
}
