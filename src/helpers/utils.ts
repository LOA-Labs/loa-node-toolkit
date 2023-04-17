import { createProtobufRpcClient, DeliverTxResponse, GasPrice, QueryClient, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import {
  Coin,
  DirectSecp256k1HdWallet,
  EncodeObject,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import axios from "axios";
import { relativeTime } from "human-date";
import { LntConfig, NetworkConfig } from "./global.types";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";




//iterate through the CONFIGS and find the one that matches the credential key/val pair provided in request
//since multiple sets of configs can run simultaneously we need to find the correct one without having to specify it in the command line
export const getCommandConfigBy = (CONFIGS: LntConfig[], { credentialsKey, value, command }): [string, LntConfig] => {
  return Object.entries(CONFIGS).find(([_, config]: any) => {

    let credentials = config?.commands?.[command]?.credentials?.[credentialsKey]

    let credentialsAr = Array.isArray(credentials) ? credentials : [credentials]

    return credentialsAr.indexOf(value) !== -1 && config.enabled

  }) || [null, null]
}

// Add cache to getCoinGeckoPrice so that we don't ping coinGecko every time we need a price
const coinGeckoCache: { [key: string]: { lastChecked: number, price: number } } = {};
const coinGeckoCacheStale = 1000 * 60 * 60 * 6 //6 hours

export const getCoinGeckoPrice = async ({
  id,
  currency,
}: { id: string, currency: string }): Promise<number> => {
  try {

    if (coinGeckoCache[id] && coinGeckoCache[id].lastChecked < new Date().getTime() - coinGeckoCacheStale) {
      console.log(`\ngetCoinGeckoPrice: (CACHED) ${id} price: ${coinGeckoCache[id].price}${currency}\n`);
      return coinGeckoCache[id].price
    }
    let res: any = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}`
    );
    let price = res.data.market_data.current_price[currency];
    coinGeckoCache[id] = { lastChecked: new Date().getTime(), price }

    console.log(`\ngetCoinGeckoPrice: ${id} price: ${price}${currency}\n`);
    return price;
  } catch (e) {
    console.log(`Caught getCoinGeckoPrice ERROR`, e);
    return 0;
  }
};

import { QueryClientImpl, QueryAllowanceRequest } from "cosmjs-types/cosmos/feegrant/v1beta1/query";
const checkFeeGrant = async (network: NetworkConfig, senderAddress): Promise<boolean> => {

  try {
    //@todo need Tendermint34Client factory to go with webSocket factor!
    const tendermint = await Tendermint34Client.connect(network.rpc);
    const queryClient = new QueryClient(tendermint);
    const rpcClient = createProtobufRpcClient(queryClient);
    const feeGrantQueryService = new QueryClientImpl(rpcClient);

    const query: QueryAllowanceRequest = {
      granter: network.granter,
      grantee: senderAddress
    }
    let res = await feeGrantQueryService.Allowance(query);
    console.log("\n========== checkFeeGrant", res)

    if (res.allowance?.allowance?.value) return true
  } catch (e) {
    console.log("\n========== Caught checkFeeGrant error:", e)
  }
  return false
}

export type SignerObject = {
  Signer: OfflineDirectSigner
  senderAddress: string
  mnemonic: string
  prefix: string
}

export const getSignerObject = async ({
  config,
  network,
  service
}): Promise<SignerObject> => {

  let mnemonic = ""
  if (network.grantee_mnemonic) { //name of mnemonic in networks config
    mnemonic = config.grantee_mnemonics[network.grantee_mnemonic]
  } else { //use default mnemonic of service
    mnemonic = config.grantee_mnemonics[service.use_mnemonic]
  }

  let prefix = extractBech32Prefix(network.granter)
  const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix
    });
  };
  const Signer: OfflineDirectSigner = await getSignerFromMnemonic();
  const senderAddress = (await Signer.getAccounts())[0].address
  return { Signer, senderAddress, mnemonic, prefix };
};

export const granterStdFee = async (network: NetworkConfig, senderAddress: string, gas_required: number): Promise<StdFee> => {

  if (network.feegrant_enabled === undefined) {
    network.feegrant_enabled = await checkFeeGrant(network, senderAddress)
  }

  gas_required = Math.ceil(gas_required * 1.5) //gas adjustment
  let gas_prices = network.gas_prices == undefined || null ? 0.03 : network.gas_prices
  let denom: string = network.denom
  let amount = `${Math.ceil(gas_required * gas_prices)}`
  let coinAmount: Coin = { amount, denom }

  let res = {
    amount: [coinAmount],
    gas: `${gas_required}`,
    granter: network.feegrant_enabled ? network.granter : ''
  }

  console.log("\n========== granterStdFee", res)
  return res
};

export const execSignAndBroadcast = async (props:
  {
    signerObject: SignerObject,
    msg: EncodeObject[]
    network: NetworkConfig,
  }) => {
  const { signerObject, msg, network } = props;

  try {
    const signingClient: SigningStargateClient = await SigningStargateClient.connectWithSigner(
      network.rpc,
      signerObject.Signer
    );

    let gas_required = network.gas || 350000 //default gas required, increased to 350k
    // simulations are not working, estimates are too low
    // try {
    //   gas_required = await signingClient.simulate(signerObject.senderAddress, msg, "simulate tx")
    //   console.log("\nsigningClient.simulate gas_required:", gas_required)
    // } catch (e) {
    //   console.log("Caught simulate error:", e);
    // }

    let fee = await granterStdFee(network, signerObject.senderAddress, gas_required)
    console.log("\ngranterStdFee:", fee)

    let res: DeliverTxResponse = await signingClient.signAndBroadcast(signerObject.senderAddress, msg, fee)
    console.log("\nsignAndBroadcast res:", res.code, res.transactionHash)
    let returning: any = { code: res.code, transactionHash: res.transactionHash }
    if (res.code !== 0) {
      console.log(res.rawLog)
      returning.rawLog = res.rawLog
    }

    return { chain_id: network.chain_id, res: returning };

  } catch (e) {
    console.log("\nCaught execSignAndBroadcast error:", e);
    return { chain_id: network.chain_id, error: e };
  }
}


export const extractBech32Prefix = (addr: string): string => {
  return addr.split("1").shift();
};

export const humanReadibleDateFromISO = (isoDate: string): string => {
  let options: any = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  };
  return new Date(isoDate).toLocaleString("en-US", options);
};

export const humanRelativeDate = (dateRepresentation: string): string => {
  return relativeTime(dateRepresentation);
};

export const unicodeToChar = (text: string): string => {
  return text.replace(/\\u[\dA-F]{4}/gi, function (match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
};

export const serviceFiltered = (
  service_name: string,
  network: NetworkConfig
): Boolean => {
  if (Array.isArray(network.filter_services)) {
    return network.filter_services.indexOf(service_name) !== -1 ? true : false;
  }
  return false;
};

export const $fmt = (value: any, pad = 0): string => {
  value = isNaN(value) ? 0 : value //ensure number 
  return value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .padStart(pad);
};

export const microToMacro = (value: any, network?: NetworkConfig): number => {
  let exponent = network?.exponent || 6
  let denomenator = parseInt("1".padEnd(exponent + 1, "0"))
  // console.log("value", value, "denomenator", denomenator)
  return parseInt(value) / denomenator;
};

export const macroToMicro = (value: any, network?: NetworkConfig): number => {
  let exponent = network?.exponent || 6
  return parseFloat(value) * parseInt("1".padEnd(exponent + 1, "0"));
};

export const icons = {
  good: "✅",
  bad: "🔴 ",
}
