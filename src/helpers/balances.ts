import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as QueryClientImplBankQuery } from "cosmjs-types/cosmos/bank/v1beta1/query";
import { QueryClientImpl as QueryClientImplStakingDelegation } from "cosmjs-types/cosmos/staking/v1beta1/query";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { NetworkConfig } from "./global.types";

export type queryBalanceResult = {
  amount: number
  error?:Error
}


export const queryBalance = async (network: NetworkConfig):Promise<queryBalanceResult> => {
  try {
    if (!network.rpc) throw new Error(`Network ${network.name}: RPC is undefined`);
    const tendermint = await Tendermint34Client.connect(network.rpc);
    const queryClient = new QueryClient(tendermint);
    const rpcClient = createProtobufRpcClient(queryClient);
    const bankQueryService = new QueryClientImplBankQuery(rpcClient);
    let res = await bankQueryService.Balance({
      address: network.granter,
      denom: network.denom,
    });
    let resultObject = {amount:Number(res.balance.amount)};
    return resultObject;
  } catch (error) {
    console.log(error);
    return { amount:0, error };
  }
};

export const queryStaked = async (network: NetworkConfig):Promise<queryBalanceResult> => {
  try {
    if (!network.rpc) throw new Error(`Network ${network.name}: RPC is undefined`);
    const tendermint = await Tendermint34Client.connect(network.rpc);
    const queryClient = new QueryClient(tendermint);
    const rpcClient = createProtobufRpcClient(queryClient);
    const stakingQueryService = new QueryClientImplStakingDelegation(rpcClient);
    let res = await stakingQueryService.Delegation({
      delegatorAddr: network.granter,
      validatorAddr: network.valoper,
    });
    let resultObject = {
      amount:Number(res.delegationResponse.balance.amount),
    };
    return resultObject;
  } catch (error) {
    console.log(error);
    return { amount:0, error };
  }
};
