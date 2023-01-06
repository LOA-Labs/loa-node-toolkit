import { GasPrice, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import {
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import axios from "axios";
import { relativeTime } from "human-date";

export const getCoinGeckoPrice = async ({
  id,
  currency,
}: any): Promise<number> => {
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
export const granterStdFee = (network) => {
  let fee: StdFee = {
        amount: [{ amount: '5000', denom: network.denom }],
        gas: `120000`,
        granter: network.granter
  }
  return network.gas_auto === true ? "auto" : fee
}
export const getSigningClient = async ({
  prefix,
  mnemonic,
  rpc,
  gasPrices,
}) => {
  const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix,
    });
  };

  const Signer: OfflineDirectSigner = await getSignerFromMnemonic();

  const senderAddress = (await Signer.getAccounts())[0].address;

  const signingClient = await SigningStargateClient.connectWithSigner(
    rpc,
    Signer,

    { gasPrice: GasPrice.fromString(`${gasPrices}`) }
  );

  return { signingClient, senderAddress };
};

export const extractPrefix = (addr: string) => {
  return addr.split("1").shift();
};

export const logg = (title: string, body: string) => {
  console.log(
    JSON.stringify(JSON.parse(body), null, 4)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
  );
};

export const humanReadibleDateFromISO = (isoDate: string) => {
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

export const humanRelativeDate = (dateRepresentation: any) => {
  return relativeTime(dateRepresentation);
};

export const unicodeToChar = (text: string) => {
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
  return value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .padStart(pad);
};

export const getPrices = async (price_api: string) => {
  try {
    return await axios.get(price_api);
  } catch (e) {
    console.log("getPrices error", e.message);
  }
};
export const findPrice = (resPrices: any, denom: string) => {
  const priceObject = resPrices.data.find((o: any) => o.denom == denom);
  const currencyObject = priceObject.prices.find(
    (o: any) => o.currency == "usd"
  );
  return Number(currencyObject.current_price);
};

export const microToMacro = (value: string | number): number => {
  return Number(value) / 1000000;
};

export const signAndBroadcast = async (props: any) => {
  const { network, signingClient, senderAddress, msg } = props;
  try {
    let res = await signingClient.signAndBroadcast(senderAddress, msg, granterStdFee(network))
    return { chain_id: network.chain_id, res };
  } catch (e) {
    console.log(e);
    return { chain_id: network.chain_id, error: e };
  }
};
