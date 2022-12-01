import {
  AppealPossible,
  KlerosLiquid,
} from "../generated/KlerosLiquid/KlerosLiquid";
import { ProofOfHumanity } from "../generated/ProofOfHumanity/ProofOfHumanity";
import { Challenge } from "../generated/schema";
import { getContract } from "../utils";
import { biToBytes, genId } from "../utils/misc";

export function handleAppealPossible(event: AppealPossible): void {
  const pohAddress = getContract().address;

  // Event not related to PoH.
  if (pohAddress.toHexString() != event.params._arbitrable.toHexString())
    return;

  const poh = ProofOfHumanity.bind(pohAddress);

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
  challenge.appealPeriodStart = appealPeriodResult.value0;
  challenge.appealPeriodEnd = appealPeriodResult.value1;
  challenge.save();
}
