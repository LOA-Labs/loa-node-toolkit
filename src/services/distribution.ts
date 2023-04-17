/*
Warning: Use caution when activating this module. Ensure that appropriate limits and authorized wallets are set in Authz grants.
*/

import { queryBalance, queryBalanceResult } from "../helpers/balances";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { notify } from "../helpers/notify";
import {
  $fmt,
  microToMacro,
  serviceFiltered,
  extractBech32Prefix,
  getCoinGeckoPrice,
  SignerObject,
  getSignerObject,
  execSignAndBroadcast,
} from "../helpers/utils";
import Report from "../helpers/class.report";
import { LntConfig, NetworkConfig, Service } from "../helpers/global.types";

const testProduction = true;

export default async (service: Service, config: LntConfig): Promise<boolean> => {

  try {
    ////////////////////////////////////////////////////
    //init reporting
    const report = new Report();
    report.addRow(`${config.title} ${service.title}`).backticks();

    //set defaults
    let titlePad = 18;
    let $pad = 16;
    let coinPad = 10;
    let curPrice = 0;
    let resDistribution: any;

    for (let index = 0; index < config.networks.length; index++) {
      const network: NetworkConfig = config.networks[index];

      if (serviceFiltered("status", network) || network?.enabled === false) continue;

      if (process.env.NODE_ENV == "production" || testProduction) {

        console.log(`\nTrying distribution for ${network.denom}...\n`);
        let pre_balance: queryBalanceResult = await queryBalance(network);
        report.section(`Pre Balance: ${pre_balance.amount}${network.denom}`);
        try {
          curPrice = await getCoinGeckoPrice({
            id: network.coingecko_id,
            currency: "usd",
          });
          console.log(`Current price is ${curPrice}`);

          ////////////////////////////////////////////////////
          //execute distrubtions
          resDistribution = await txDistribution({ config, network, service });
          console.log("resDistribution", resDistribution);

        } catch (e) {
          console.log("ERROR", e);
        }
      }

      ////////////////////////////////////////////////////
      //prepare report
      report.addRow(`${network.chain_id}\nPrice:\t${$fmt(curPrice, 20)}`);
      for (let index = 0; index < resDistribution.sendReport.length; index++) {
        let sendReport: any = resDistribution.sendReport[index];
        let $value = microToMacro(sendReport.amount) * curPrice;
        let macroAmountDisplay = `${sendReport.amount}${network.denom}`.padStart(
          coinPad
        );
        report.addRow(
          `\n${"To:".padEnd(titlePad)}${sendReport.toAddress}` +
          `\n${"Amount:".padEnd(titlePad)}${macroAmountDisplay}${$fmt(
            $value,
            $pad
          )}`
        );
      }

      let new_balance: queryBalanceResult = await queryBalance(network);
      report.addRow(`\nNew Balance: ${new_balance.amount}${network.denom}`).section();


    }

    await notify({ text: report.backticks().print(), config, service });
    return true

  } catch (e) {
    await notify({ text: `Caught Error ${e.message}`, config, service });
    return false
  }
};


////////////////////////////////////////////////////
//MsgSend transaction, abstract into separate function
const txDistribution = async ({ config, network, service }): Promise<any> => {
  let balance: queryBalanceResult = await queryBalance(network);

  ////////////////////////////////////////////////////
  //get signer address
  const signerObject: SignerObject = await getSignerObject({ config, network, service })

  const distributionMsgsAr = [];
  const sendReport = [];

  for (let index = 0; index < network.distribution.length; index++) {
    let dist = network.distribution[index];
    let amount: any = Math.floor(Number(balance.amount) * dist.allocation);

    let distValues = {
      fromAddress: network.granter,
      toAddress: dist.addr,
      amount: [
        {
          denom: network.denom,
          amount: `${amount}`,
        },
      ],
    };

    distributionMsgsAr.push({
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: MsgSend.encode(MsgSend.fromPartial(distValues)).finish(),
    });

    sendReport.push({
      toAddress: dist.addr,
      amount,
    });
  }

  const MsgExec = {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec",
    value: {
      grantee: signerObject.senderAddress,
      msgs: distributionMsgsAr,
    },
  };

  let res: any = await execSignAndBroadcast({ signerObject, msg: [MsgExec], network });
  res.sendReport = sendReport;
  return res;
};
