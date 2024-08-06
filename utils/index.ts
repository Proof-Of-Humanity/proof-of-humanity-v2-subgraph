import { Address, BigInt, ByteArray, Bytes } from "@graphprotocol/graph-ts";
import {
  Claimer,
  Contract,
  Request,
  Humanity,
  Registration,
  EvidenceGroup,
  ArbitratorHistory,
} from "../generated/schema";
import { ZERO, ONE, ZERO_Bridged } from "./constants";
import { biToBytes, biToBytesReversed, hash } from "./misc";
import { StatusUtil } from "./enums";

export const LEGACY_FLAG = Bytes.fromUTF8("legacy");
export const BRIDGED_FLAG = Bytes.fromUTF8("bridged");

function getLatestArbitratorHistory(): string {
  const arbitratorHistory: ArbitratorHistory = 
    ArbitratorHistory.load("legacy#" + ZERO.toString()) as ArbitratorHistory;
  return arbitratorHistory.id as string;
}

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

export function getPreviousNonRevoked(pohId: Bytes, index: BigInt): Request | null {
  var indexRevokedReq = index;
  var revokedReqId: Bytes;
  var request: Request | null;
  do {
    var indexSeed: BigInt;
    var flag = Bytes.fromUTF8("");
    if (index.ge(ZERO)) {
      indexRevokedReq = indexRevokedReq.minus(ONE);
      indexSeed = indexRevokedReq;
    } else if (index.le(ZERO_Bridged.neg())) {
      indexRevokedReq = indexRevokedReq.plus(ONE);
      indexSeed = indexRevokedReq.abs();
      flag = BRIDGED_FLAG;
    } else {
      indexRevokedReq = indexRevokedReq.plus(ONE);
      indexSeed = indexRevokedReq.abs();
      flag = LEGACY_FLAG;
    }
    revokedReqId = hash(
      pohId.concat(biToBytes(indexSeed)).concat(flag)
    );
    request = Request.load(revokedReqId);
  } while ((!!request) && (request.revocation));
  return request;
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
      humanity.nbBridgedRequests = ZERO_Bridged;
      humanity.inTransfer = false;
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
    function getEvGroupId(pohId: Bytes, index: BigInt): Bytes {
      return Bytes.fromUint8Array(
        biToBytesReversed(
          BigInt.fromByteArray(
            Bytes.fromUint8Array(
              BigInt.fromByteArray(
                biToBytes(
                  BigInt.fromByteArray(pohId),
                  20
                )
              )
              .plus(
                BigInt.fromByteArray(
                  biToBytes(
                    index
                    .plus(ONE)
                    .abs(), 
                    20
                  )
                )
              )
              .reverse()
            )
          ), 
          20, 
          pohId.at(-1) == 0
        )
        .reverse()
      );
    }

    let requestId: Bytes;
    let evGroupId: Bytes;

    if (index.ge(ZERO)) {
      requestId = hash(pohId.concat(biToBytes(index)));
      evGroupId = hash(
        ByteArray.fromHexString(pohId.toHex())
          .concat(new ByteArray(32 - index.byteLength))
          .concat(ByteArray.fromBigInt(index))
      );
    } else if (index.le(ZERO_Bridged.neg())) {
      requestId = hash(
        pohId.concat(biToBytes(index.plus(ONE).abs())).concat(BRIDGED_FLAG)
      );
      // A transferred profile will not have evidenceGroup since it does not exist on 
      // the contract and thus, no event is triggered which therefore means that 
      // function handleEvidence on mappings/index.ts will not be called. However, we
      // need to create the group having an empty evidence array.
      evGroupId = getEvGroupId(pohId, index);
    } else {
      requestId = hash(
        pohId.concat(biToBytes(index.plus(ONE).abs())).concat(LEGACY_FLAG)
      );
      evGroupId = getEvGroupId(pohId, index);
    }
    let evidenceGroup = EvidenceGroup.load(evGroupId);
    if (evidenceGroup == null) {
      evidenceGroup = new EvidenceGroup(evGroupId);
      evidenceGroup.length = ZERO;
      evidenceGroup.save();
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
        .latestArbitratorHistory? getContract()
        .latestArbitratorHistory as string : getLatestArbitratorHistory() as string;
      request.nbChallenges = ZERO;
      request.contributors = [];
      request.evidenceGroup = evGroupId;
      request.registrationEvidenceRevokedReq = "";
    }
    return request;
  }
}
