import {
  AppealPossible,
  KlerosLiquid,
} from "../generated/KlerosLiquid/KlerosLiquid";
import { ProofOfHumanity } from "../generated/ProofOfHumanity/ProofOfHumanity";
import { Challenge } from "../generated/schema";
import { biToBytes, hash } from "../utils/misc";
import { ProofOfHumanityAddress } from "../utils/hardcoded";

export function handleAppealPossible(event: AppealPossible): void {
  if (!ProofOfHumanityAddress.equals(event.params._arbitrable)) return;

  const poh = ProofOfHumanity.bind(event.params._arbitrable);

  const disputeData = poh.disputeIdToData(
    event.address,
    event.params._disputeID
  );

  const challenge = Challenge.load(
    hash(
      hash(
        disputeData
          .getHumanityId()
          .concat(biToBytes(disputeData.getRequestId()))
      ).concat(biToBytes(disputeData.getChallengeId()))
    )
  ) as Challenge;

  const arbitrator = KlerosLiquid.bind(event.address);
  const appealPeriodResult = arbitrator.appealPeriod(event.params._disputeID);
  challenge.appealPeriodStart = appealPeriodResult.getStart();
  challenge.appealPeriodEnd = appealPeriodResult.getEnd();
  challenge.save();
}
