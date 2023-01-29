import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  crypto,
} from "@graphprotocol/graph-ts";

export const PROOF_OF_HUMANITY_ADDRESS = Address.zero();

export const ZERO_ADDRESS = Address.zero();

export const ZERO = Bytes.fromI32(0);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE = Bytes.fromI32(1);
export const ONE_BI = BigInt.fromI32(1);
export const TWO = Bytes.fromI32(2);
export const TWO_BI = BigInt.fromI32(2);

export class Party {
  static readonly None: string = "None";
  static readonly Requester: string = "Requester";
  static readonly Challenger: string = "Challenger";

  static parse(status: i32): string {
    switch (status) {
      case 0:
        return this.None;
      case 1:
        return this.Requester;
      case 2:
        return this.Challenger;
      default:
        return "Error";
    }
  }
}

export class Status {
  static readonly Vouching: string = "Vouching";
  static readonly Resolving: string = "Resolving";
  static readonly Disputed: string = "Disputed";
  static readonly Resolved: string = "Resolved";
  static readonly Withdrawn: string = "Withdrawn";

  static parse(status: i32): string {
    switch (status) {
      case 0:
        return this.Vouching;
      case 1:
        return this.Resolving;
      case 2:
        return this.Disputed;
      case 3:
        return this.Resolved;
      case 4:
        return this.Withdrawn;
      default:
        return "Error";
    }
  }
}

export class Reason {
  static readonly None: string = "None";
  static readonly IncorrectSubmission: string = "IncorrectSubmission";
  static readonly Deceased: string = "Deceased";
  static readonly Duplicate: string = "Duplicate";
  static readonly DoesNotExist: string = "DoesNotExist";

  static parse(reason: i32): string {
    switch (reason) {
      case 0:
        return this.None;
      case 1:
        return this.IncorrectSubmission;
      case 2:
        return this.Deceased;
      case 3:
        return this.Duplicate;
      case 4:
        return this.DoesNotExist;
      default:
        return "Error";
    }
  }
}

export class SubmissionStatusOld {
  static readonly None: string = "None";
  static readonly Vouching: string = "Vouching";
  static readonly PendingRegistration: string = "PendingRegistration";
  static readonly PendingRemoval: string = "PendingRemoval";

  static parse(status: i32): string {
    switch (status) {
      case 0:
        return this.None;
      case 1:
        return this.Vouching;
      case 2:
        return this.PendingRegistration;
      case 3:
        return this.PendingRemoval;
      default:
        return "Error";
    }
  }
}

export const submitEvidenceSig = Bytes.fromUint8Array(
  crypto
    .keccak256(ByteArray.fromUTF8("submitEvidence(bytes20,uint256,string)"))
    .slice(0, 4)
);
