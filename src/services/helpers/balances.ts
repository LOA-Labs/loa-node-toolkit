
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as QueryClientImplBankQuery } from "cosmjs-types/cosmos/bank/v1beta1/query";
import { QueryClientImpl as QueryClientImplStakingDelegation } from "cosmjs-types/cosmos/staking/v1beta1/query";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";


export default async (network: any) => {
  if (!network.rpc) return
  try {
    const tendermint = await Tendermint34Client.connect(network.rpc);
    const queryClient = new QueryClient(tendermint);
    const rpcClient = createProtobufRpcClient(queryClient);
    const bankQueryService = new QueryClientImplBankQuery(rpcClient);
    let res = await bankQueryService.Balance({
      address: network.addr_grantor,
      denom: network.denom,
    });
    // console.log(res)
    let resultObject = { chain_id: network.chain_id, ...res.balance }
    return resultObject
  } catch (error) {
    // console.log(error)
    return { chain_id: network.chain_id, error }
  }
};

export const queryStaked = async (network: any) => {
  if (!network.rpc) return
  try {
    const tendermint = await Tendermint34Client.connect(network.rpc);
    const queryClient = new QueryClient(tendermint);
    const rpcClient = createProtobufRpcClient(queryClient);
    const stakingQueryService = new QueryClientImplStakingDelegation(rpcClient);
    let res = await stakingQueryService.Delegation({
      delegatorAddr: network.addr_grantor,
      validatorAddr: network.addr_validator
    });
    // console.log(res)
    let resultObject = { chain_id: network.chain_id, ...res.delegationResponse.balance }
    return resultObject
  } catch (error) {
    // console.log(error)
    return { chain_id: network.chain_id, error }
  }
};

