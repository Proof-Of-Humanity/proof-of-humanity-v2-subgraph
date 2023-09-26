import { Party, Reason, Status } from "../generated/schema";
import { ONE, ZERO } from "./constants";

export class PartyUtil {
  static readonly none: string = "none";
  static readonly requester: string = "requester";
  static readonly challenger: string = "challenger";

  static parse(party: i32): string {
    switch (party) {
      case 0:
        return this.none;
      case 1:
        return this.requester;
      case 2:
        return this.challenger;
      default:
        return "error";
    }
  }

  static createIfNew(name: string): void {
    if (Party.load(name) == null) {
      const party = new Party(name);
      party.count = ZERO;
      party.save();
    }
  }

  static increment(name: string): void {
    const party = Party.load(name) as Party;
    party.count = party.count.plus(ONE);
    party.save();
  }

  static decrement(name: string): void {
    const party = Party.load(name) as Party;
    party.count = party.count.minus(ONE);
    party.save();
  }
}

export class StatusUtil {
  static readonly vouching: string = "vouching";
  static readonly resolving: string = "resolving";
  static readonly disputed: string = "disputed";
  static readonly resolved: string = "resolved";
  static readonly withdrawn: string = "withdrawn";

  static parse(status: i32): string {
    switch (status) {
      case 0:
        return this.vouching;
      case 1:
        return this.resolving;
      case 2:
        return this.disputed;
      case 3:
        return this.resolved;
      case 4:
        return this.withdrawn;
      default:
        return "error";
    }
  }

  static createIfNew(name: string): void {
    if (Status.load(name) == null) {
      const status = new Status(name);
      status.count = ZERO;
      status.save();
    }
  }

  static increment(name: string): void {
    const status = Status.load(name) as Status;
    status.count = status.count.plus(ONE);
    status.save();
  }

  static decrement(name: string): void {
    const status = Status.load(name) as Status;
    status.count = status.count.minus(ONE);
    status.save();
  }
}

export class ReasonUtil {
  static readonly none: string = "none";
  static readonly incorrectSubmission: string = "incorrectSubmission";
  static readonly deceased: string = "deceased";
  static readonly duplicate: string = "duplicate";
  static readonly doesNotExist: string = "doesNotExist";

  static parse(reason: i32): string {
    switch (reason) {
      case 0:
        return this.none;
      case 1:
        return this.incorrectSubmission;
      case 2:
        return this.deceased;
      case 3:
        return this.duplicate;
      case 4:
        return this.doesNotExist;
      default:
        return "error";
    }
  }

  static createIfNew(name: string): void {
    if (Reason.load(name) == null) {
      const reason = new Reason(name);
      reason.count = ZERO;
      reason.save();
    }
  }

  static increment(name: string): void {
    const reason = Reason.load(name) as Reason;
    reason.count = reason.count.plus(ONE);
    reason.save();
  }

  static decrement(name: string): void {
    const reason = Reason.load(name) as Reason;
    reason.count = reason.count.minus(ONE);
    reason.save();
  }
}
