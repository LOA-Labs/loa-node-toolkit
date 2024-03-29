import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate"; import {
  QueryClientImpl,
  QueryProposalsRequest,
  QueryProposalsResponse,
  QueryVoteRequest
} from "cosmjs-types/cosmos/gov/v1beta1/query";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";

import { unicodeToChar } from "./utils";
import { ProposalStatus, VoteOption } from "cosmjs-types/cosmos/gov/v1beta1/gov";

export type OnChainProposalResult = {
  proposal_id: number
  chain_id: string
  type: string
  voting_end_time: string
  title: string
  description: string
  option: number
  status: ProposalStatus
}

export const VoteOptions = [
  { chain: VoteOption.VOTE_OPTION_UNSPECIFIED, human: "n/a" },
  { chain: VoteOption.VOTE_OPTION_YES, human: "yes" },
  { chain: VoteOption.VOTE_OPTION_ABSTAIN, human: "abstain" },
  { chain: VoteOption.VOTE_OPTION_NO, human: "no" },
  { chain: VoteOption.VOTE_OPTION_NO_WITH_VETO, human: "nowithveto" },
]
export const chainReadibleVoteOption = (option: number): VoteOption => {
  return VoteOptions[option].chain
}
export const humanReadibleVoteOption = (option: number): string => {
  return VoteOptions[option].human
}
export const humanVoteOptionToNumber = (text: string): VoteOption => {
  text = text.toLowerCase().trim()
  let option = VoteOptions.find(item => item.human == text)
  return option ? option.chain : 0
}

export const ProposalStatuses = [
  { chain: ProposalStatus.PROPOSAL_STATUS_UNSPECIFIED, human: "N/A" },
  { chain: ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD, human: "Deposit Period" },
  { chain: ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD, human: "Voting Period" },
  { chain: ProposalStatus.PROPOSAL_STATUS_PASSED, human: "PASSED" },
  { chain: ProposalStatus.PROPOSAL_STATUS_REJECTED, human: "REJECTED" },
  { chain: ProposalStatus.PROPOSAL_STATUS_FAILED, human: "FAILED" }
]
export const chainReadibleProposalStatus = (status: number): ProposalStatus => {
  return ProposalStatuses[status].chain
}
export const humanReadibleProposalStatus = (status: number): string => {
  return ProposalStatuses[status].human
}

export const queryOnChainProposals = async ({ network, status }): Promise<OnChainProposalResult[]> => {
  if (!network.rpc) return []
  try {
    const tendermint = await Tendermint34Client.connect(network.rpc);
    const queryClient = new QueryClient(tendermint);
    const rpcClient = createProtobufRpcClient(queryClient);
    const QueryService = new QueryClientImpl(rpcClient);
    const request: QueryProposalsRequest = { proposalStatus: chainReadibleProposalStatus(status), voter: "", depositor: "" }
    let res: QueryProposalsResponse = await QueryService.Proposals(request);
    //network has enabled propsals
    if (res.proposals?.length) {
      const proposalsParsed: OnChainProposalResult[] = []
      for (let index = 0; index < res.proposals.length; index++) {

        const prop = res.proposals[index];
        let resVote = null
        try {
          const request: QueryVoteRequest = { proposalId: prop.proposalId, voter: network.granter }
          resVote = await QueryService.Vote(request);
        } catch (e) {
          console.log(`\tPROP ${network.name}  ${prop.proposalId} NO VOTE FOUND`)
        }
        let description = unicodeToChar(new TextDecoder().decode(prop.content.value))
        let title = description.replace(/[a-z][^�#\n]*/, "")
        proposalsParsed.push({
          proposal_id: prop.proposalId.low,
          chain_id: network.chain_id,
          type: prop.content.typeUrl.split(".").pop(),
          voting_end_time: new Date(prop.votingEndTime.seconds.low * 1000).toISOString(),
          title,
          description,
          option: resVote?.vote?.options?.[0].option ? Number(resVote?.vote?.options?.[0].option) : 0,
          status: prop.status
        })

      }
      return proposalsParsed
    } else {
      console.log(`\n\tNo ${network.chain_id} proposals found`)
      return []
    }

  } catch (e) {
    console.log(`queryOnChainProposals caught error for ${network.name}`, e)
    return []
  }
};