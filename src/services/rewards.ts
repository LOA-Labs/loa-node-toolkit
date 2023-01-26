import { queryBalance, queryStaked, queryBalanceResult } from "../helpers/balances";
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawValidatorCommission,
} from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { notify } from "../helpers/notify";
import {
  $fmt,
  extractBech32Prefix,
  getSigningClient,
  microToMacro,
  serviceFiltered,
  getCoinGeckoPrice,
  granterStdFee,
} from "../helpers/utils";
import Report from "../helpers/class.report";
import { LntConfig, NetworkConfig, Service } from "../helpers/global.types";

const testAsProduction = true;

export default async (service: Service, config: LntConfig): Promise<boolean> => {

  try {

    const nowTime = new Date().toISOString();
    console.log(`\t${config.title} ${service.title} \n\tTime: ${nowTime}`);

    const report = new Report();
    report.addRow(`${config.title} ${service.title}`).backticks();


    let titlePad = 18;
    let $pad = 16;
    let $EarningsTotal: number = 0;
    let $BalanceTotal: number = 0;
    let $StakedTotal: number = 0;

    for (let index = 0; index < config.networks.length; index++) {

      const network: NetworkConfig = config.networks[index];

      if (serviceFiltered("rewards", network) || network.enabled === false)
        continue;

      //defaults
      let macroDenom = network.denom.substring(1);
      let macroEarnings = 0;
      let macroBalance = 0;
      let macroStaked = 0;
      let macroRestaked = 0;
      let price = 0;

      if (process.env.NODE_ENV === "production" || testAsProduction) {
        try {
          ////////////////////////////////////////////////////
          //get price
          price = await getCoinGeckoPrice({
            id: network.coingecko_id,
            currency: "usd",
          });

          const preBalance: queryBalanceResult = await queryBalance(network);

          ////////////////////////////////////////////////////
          //withdraw rewards and commissions
          let resRewards: any = await txRewards({ config, network, service });
          console.log(JSON.stringify(resRewards.res.events))

          ////////////////////////////////////////////////////
          //resRewards.res.rawLog is array with object types "type": "withdraw_rewards",  "type": "withdraw_commission" but need to be iterated to find, easier to compare postBalance to get the earnings
          const postBalance: queryBalanceResult = await queryBalance(network);
          let earnings = Math.abs(postBalance.amount - preBalance.amount);
          console.log("Earnings:", earnings);

          ////////////////////////////////////////////////////
          //if restake amount set in network config, execute restaking tx
          let amountToRestake = Math.floor(earnings * Number(network.restake || 0));
          if (Math.abs(amountToRestake) > 0) {
            let resRestake: any = await txRestake({
              amountToRestake,
              config,
              network,
              service,
            });
          }
          const stakedBalance: queryBalanceResult = await queryStaked(network);

          ////////////////////////////////////////////////////
          //prepare human readable amounts
          macroEarnings = microToMacro(earnings);
          macroBalance = microToMacro(postBalance.amount);
          macroRestaked = microToMacro(amountToRestake);
          macroStaked = microToMacro(stakedBalance.amount);

        } catch (e) {
          console.log("ERROR", e);
        }
      }


      ////////////////////////////////////////////////////
      //get values in fiat
      let $Earnings: any = macroEarnings * price;
      let $Balance: any = macroBalance * price;
      let $Restaked: any = macroRestaked * price;
      let $Staked: any = macroStaked * price;

      ////////////////////////////////////////////////////
      //add to report total
      $EarningsTotal += !isNaN($Earnings) ? $Earnings : 0;
      $BalanceTotal += !isNaN($Balance) ? $Balance : 0;
      $StakedTotal += !isNaN($Staked) ? $Staked : 0;

      ////////////////////////////////////////////////////
      //prep report display
      let denomPad = 21;
      let macroEarningsDisplay = (macroEarnings + macroDenom).padStart(denomPad);
      let macroBalanceDisplay = (macroBalance + macroDenom).padStart(denomPad);
      let macroRestakedDisplay = (macroRestaked + macroDenom).padStart(denomPad);
      let macroStakedDisplay = (macroStaked + macroDenom).padStart(denomPad);

      ////////////////////////////////////////////////////
      //add row to report
      report.addRow(
        `---\n${network.chain_id}` +
        `\n${"Price:".padEnd(titlePad)}${$fmt(price)}` +
        `\n${"Earnings:".padEnd(titlePad)}${macroEarningsDisplay}${$fmt(
          $Earnings,
          $pad
        )}` +
        `\n${"Liquid Balance:".padEnd(titlePad)}${macroBalanceDisplay}${$fmt(
          $Balance,
          $pad
        )}` +
        `\n${`${network.restake * 100}% Restaked:`.padEnd(
          titlePad
        )}${macroRestakedDisplay}${$fmt($Restaked, $pad)}` +
        `\n${"Total Staked:".padEnd(titlePad)}${macroStakedDisplay}${$fmt(
          $Staked,
          $pad
        )}`
      );
    }

    let totalPad = 25;
    let total$Pad = 30;

    ////////////////////////////////////////////////////
    //add totals to report
    report
      .addRow(
        `\n---------` +
        `\n${"Total Earnings:".padEnd(totalPad)}${$fmt(
          $EarningsTotal,
          total$Pad
        )}` +
        `\n${"Total Liquid Balance:".padEnd(totalPad)}${$fmt(
          $BalanceTotal,
          total$Pad
        )}` +
        `\n${"Total Staked:".padEnd(totalPad)}${$fmt($StakedTotal, total$Pad)}`
      )
      .backticks();

    await notify({ text: report.print(), config, service });
    return true

  } catch (e) {
    await notify({ text: `Caught Error ${e.message}`, config, service });
    return false
  }
}


////////////////////////////////////////////////////
//validator distributions transaction, abstract into separate function
const txRewards = async ({ config, network, service }): Promise<any> => {
  const { signingClient, senderAddress } = await getSigningClient({
    mnemonic: config.grantee_mnemonics[service.use_mnemonic],
    rpc: network.rpc,
    gasPrices: `${network.gas_prices}${network.denom}`,
    prefix: extractBech32Prefix(network.granter),
  });

  const txMsgWithdrawDelegatorReward = {
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    value: MsgWithdrawDelegatorReward.encode(
      MsgWithdrawDelegatorReward.fromPartial({
        delegatorAddress: network.granter,
        validatorAddress: network.valoper,
      })
    ).finish(),
  };

  const txMsgWithdrawValidatorCommission = {
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission",
    value: MsgWithdrawValidatorCommission.encode(
      MsgWithdrawValidatorCommission.fromPartial({
        validatorAddress: network.valoper,
      })
    ).finish(),
  };

  const MsgExec = {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec",
    value: {
      grantee: senderAddress,
      msgs: [txMsgWithdrawDelegatorReward, txMsgWithdrawValidatorCommission],
    },
  };

  try {
    let res = await signingClient.signAndBroadcast(
      senderAddress,
      [MsgExec],
      granterStdFee(network)
    );
    return { chain_id: network.chain_id, res };
  } catch (e) {
    console.log(e);
    return { chain_id: network.chain_id, error: e };
  }
};

////////////////////////////////////////////////////
//validator restaking transaction, abstract into separate function
const txRestake = async ({ amountToRestake, config, network, service }): Promise<any> => {
  console.log("restaking", amountToRestake, network.denom);

  const { signingClient, senderAddress } = await getSigningClient({
    mnemonic: config.grantee_mnemonics[service.use_mnemonic],
    rpc: network.rpc,
    gasPrices: `${network.gas_prices}${network.denom}`,
    prefix: extractBech32Prefix(network.granter),
  });

  const txMsgDelegate = {
    typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
    value: MsgDelegate.encode(
      MsgDelegate.fromPartial({
        delegatorAddress: network.granter,
        validatorAddress: network.valoper,
        amount: {
          denom: network.denom,
          amount: `${amountToRestake}`,
        },
      })
    ).finish(),
  };

  const MsgExec = {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec",
    value: {
      grantee: senderAddress,
      msgs: [txMsgDelegate],
    },
  };

  try {
    let res = await signingClient.signAndBroadcast(
      senderAddress,
      [MsgExec],
      granterStdFee(network)
    );
    return { chain_id: network.chain_id, res };
  } catch (e) {
    console.log(e);
    return { chain_id: network.chain_id, error: e };
  }
};
