import { GasPrice, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import {
  Coin,
  DirectSecp256k1HdWallet,
  EncodeObject,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import axios from "axios";
import { relativeTime } from "human-date";
import { LntConfig, NetworkConfig } from "./global.types";

export const signAndBroadcast = async (props:
  {
    network: NetworkConfig,
    signingClient: SigningStargateClient,
    senderAddress: string,
    msg: EncodeObject[]
  }) => {
  const { network, signingClient, senderAddress, msg } = props;
  try {
    let res = await signingClient.signAndBroadcast(senderAddress, msg, granterStdFee(network))
    return { chain_id: network.chain_id, res };
  } catch (e) {
    console.log(e);
    return { chain_id: network.chain_id, error: e };
  }
};


//iterate through the CONFIGS and find the one that matches the credential key/val pair provided in request
//since multiple sets of configs can run simultaneously we need to find the correct one without having to specify it in the command line
export const getCommandConfigBy = (CONFIGS: LntConfig[], { credentialsKey, value, command }): [string, LntConfig] => {
  return Object.entries(CONFIGS).find(([_, config]: any) => {

    let credentials = config?.commands?.[command]?.credentials?.[credentialsKey]

    let credentialsAr = Array.isArray(credentials) ? credentials : [credentials]

    return credentialsAr.indexOf(value) !== -1 && config.enabled

  }) || [null, null]
}

export const getCoinGeckoPrice = async ({
  id,
  currency,
}: { id: string, currency: string }): Promise<number> => {
  try {
    let res: any = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}`
    );
    let price = res.data.market_data.current_price[currency];
    console.log(`\ngetCoinGeckoPrice: ${id} price: ${price}${currency}\n`);
    return price;
  } catch (e) {
    console.log(`getCoinGeckoPrice ERROR`, e);
    return 0;
  }
};

//@todo: combine auto with stdFee for FeeGrant txs or use tx gas estimatation query
export const granterStdFee = (network: NetworkConfig): "auto" | StdFee => {
  let granter: string = network.granter
  let denom: string = network.denom
  let amount: Coin = { amount: '6000', denom }
  let stdFee: StdFee = {
    amount: [amount],
    gas: `240000`,
    granter
  }
  return network.gas_auto === true ? "auto" : stdFee
};

export const getSigningClient = async ({
  prefix,
  mnemonic,
  rpc,
  gasPrices,
}): Promise<{ signingClient: SigningStargateClient, senderAddress: string }> => {

  const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix,
    });
  };

  const Signer: OfflineDirectSigner = await getSignerFromMnemonic();

  const senderAddress = (await Signer.getAccounts())[0].address;

  const signingClient: SigningStargateClient = await SigningStargateClient.connectWithSigner(
    rpc,
    Signer,
    { gasPrice: GasPrice.fromString(`${gasPrices}`) }
  );

  return { signingClient, senderAddress };
};

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
  network: any
): Boolean => {
  if (Array.isArray(network.filterServices)) {
    return network.filter_services.indexOf(service_name) != -1 ? true : false;
  }
  return false;
};

export const $fmt = (value: number, pad = 0): string => {
  value = isNaN(value) ? 0 : value //ensure number 
  return value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .padStart(pad);
};

export const microToMacro = (value: any): number => {
  return parseInt(value) / 1000000;
};


export const icons = {
  good: "✅",
  bad: "🚨"
}
