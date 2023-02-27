import { log } from "@graphprotocol/graph-ts";
import {
  AppealPossible,
  KlerosLiquid,
} from "../generated/KlerosLiquid/KlerosLiquid";
import { ProofOfHumanity } from "../generated/ProofOfHumanity/ProofOfHumanity";
import { Challenge } from "../generated/schema";
import { getContract } from "../utils";
import { biToBytes, genId } from "../utils/misc";

export function handleAppealPossible(event: AppealPossible): void {
  log.warning("Arb: {} | Dispute: {}", [
    event.params._arbitrable.toHexString(),
    event.params._disputeID.toString(),
  ]);
  if (
    getContract().address.toHexString() !=
    event.params._arbitrable.toHexString()
  )
    return;

  const poh = ProofOfHumanity.bind(event.params._arbitrable);

  const disputeData = poh.disputeIdToData(
    event.address,
    event.params._disputeID
  );

  const challenge = Challenge.load(
    genId(
      genId(disputeData.getHumanityId(), biToBytes(disputeData.getRequestId())),
      biToBytes(disputeData.getChallengeId())
    )
  ) as Challenge;

  const arbitrator = KlerosLiquid.bind(event.address);
  const appealPeriodResult = arbitrator.appealPeriod(event.params._disputeID);
  challenge.appealPeriodStart = appealPeriodResult.getStart();
  challenge.appealPeriodEnd = appealPeriodResult.getEnd();
  challenge.save();
}
