import queryBalance, { queryStaked } from './helpers/balances';
import { MsgWithdrawDelegatorReward, MsgWithdrawValidatorCommission } from "cosmjs-types/cosmos/distribution/v1beta1/tx"
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx"
import notify from './helpers/notify';
import { $fmt, extractPrefix, getPrices, getSigningClient, microToMacro, serviceFiltered } from './helpers/utils';
import Report from './helpers/class.report';

export default async (service: any, config: any) => {

    const nowTime = new Date().toISOString()
    console.log(`\t${config.title} ${service.title} \n\tTime: ${nowTime}`)

    const report = new Report()
    report.addRow(`${config.title} ${service.title}`).backticks()

    const resPrices: any = await getPrices(config.price_api)

    let titlePad = 18
    let $pad = 16
    let $EarningsTotal: number = 0
    let $BalanceTotal: number = 0
    let $StakedTotal: number = 0

    for (let index = 0; index < config.networks.length; index++) {
        const network = config.networks[index];
        if (serviceFiltered("status", network)) continue

        let macroDenom = network.denom.substring(1)
        let macroEarnings = 0
        let macroBalance = 0
        let macroStaked = 0
        let macroRestaked = 0
        let price = 0

        if (process.env.NODE_ENV === "production") {
            try {
                const priceObject = resPrices.data.find((o: any) => o.denom == network.denom)
                const currencyObject = priceObject.prices.find((o: any) => o.currency == "usd")
                price = Number(currencyObject.current_price)

                let preBalance: any = await queryBalance(network)

                if (network.txRewards !== false) {
                    let resRewards: any = await txRewards({ config, network, service })
                }
                let postBalance: any = await queryBalance(network)

                postBalance = Number(postBalance.amount)
                preBalance = Number(preBalance.amount)

                let earnings = postBalance - preBalance
                console.log("earnings", earnings)
                let restaked = Math.floor(earnings * Number(network.restake || 0))

                if (restaked) {
                    console.log("restaking", restaked)
                    let resRestake: any = await txRestake({ restaked, config, network, service })
                }

                let stakedBalance: any = await queryStaked(network)
                stakedBalance = Number(stakedBalance.amount)

                macroEarnings = microToMacro(earnings)
                console.log("macroEarnings", macroEarnings)
                macroBalance = microToMacro(postBalance)
                macroRestaked = microToMacro(restaked)
                macroStaked = microToMacro(stakedBalance)

            } catch (e) {
                console.log("ERROR", e)
            }
        }

        let $Earnings: any = macroEarnings * price
        let $Balance: any = macroBalance * price
        let $Restaked: any = macroRestaked * price
        let $Staked: any = macroStaked * price

        $EarningsTotal += !isNaN($Earnings) ? $Earnings : 0
        $BalanceTotal += !isNaN($Balance) ? $Balance : 0
        $StakedTotal += !isNaN($Staked) ? $Staked : 0

        let denomPad = 21
        let macroEarningsDisplay = (macroEarnings + macroDenom).padStart(denomPad)
        let macroBalanceDisplay = (macroBalance + macroDenom).padStart(denomPad)
        let macroRestakedDisplay = (macroRestaked + macroDenom).padStart(denomPad)
        let macroStakedDisplay = (macroStaked + macroDenom).padStart(denomPad)

        report.addRow(`---\n${network.chain_id}` +
            `\n${'Price:'.padEnd(titlePad)}${$fmt(price)}` +
            `\n${'Earnings:'.padEnd(titlePad)}${macroEarningsDisplay}${$fmt($Earnings, $pad)}` +
            `\n${'Liquid Balance:'.padEnd(titlePad)}${macroBalanceDisplay}${$fmt($Balance, $pad)}` +
            `\n${`${network.restake * 100}% Restaked:`.padEnd(titlePad)}${macroRestakedDisplay}${$fmt($Restaked, $pad)}` +
            `\n${'Total Staked:'.padEnd(titlePad)}${macroStakedDisplay}${$fmt($Staked, $pad)}`)
    }

    let totalPad = 25
    let total$Pad = 30

    report.addRow(`\n---------` +
        `\n${'Total Earnings:'.padEnd(totalPad)}${$fmt($EarningsTotal, total$Pad)}` +
        `\n${'Total Liquid Balance:'.padEnd(totalPad)}${$fmt($BalanceTotal, total$Pad)}` +
        `\n${'Total Staked:'.padEnd(totalPad)}${$fmt($StakedTotal, total$Pad)}`).backticks()

    await notify({ text: report.print(), config, service })

}

const txRewards = async ({ config, network, service }) => {

    const { signingClient, senderAddress } = await getSigningClient({
        mnemonic: config.grantee_mnemonics[service.use_mnemonic],
        rpc: network.rpc,
        gasPrices: `${network.gas_prices}${network.denom}`,
        prefix: extractPrefix(network.addr_grantor)
    })

    const txMsgWithdrawDelegatorReward = {
        typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
        value: MsgWithdrawDelegatorReward.encode(
            MsgWithdrawDelegatorReward.fromPartial({
                delegatorAddress: network.addr_grantor,
                validatorAddress: network.addr_validator,
            })).finish()
    };

    const txMsgWithdrawValidatorCommission = {
        typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission",
        value: MsgWithdrawValidatorCommission.encode(
            MsgWithdrawValidatorCommission.fromPartial({
                validatorAddress: network.addr_validator,
            })).finish()
    };

    const MsgExec = {
        typeUrl: "/cosmos.authz.v1beta1.MsgExec",
        value: {
            grantee: senderAddress,
            msgs: [txMsgWithdrawDelegatorReward, txMsgWithdrawValidatorCommission]
        },
    };

    try {
        let res = await signingClient.signAndBroadcast(senderAddress, [MsgExec], "auto");
        return { chain_id: network.chain_id, res }

    } catch (e) {
        console.log(e)
        return { chain_id: network.chain_id, error: e }
    }
}


const txRestake = async ({ restaked, config, network, service }) => {

    console.log("restaking", restaked, network.denom)

    const { signingClient, senderAddress } = await getSigningClient({
        mnemonic: config.grantee_mnemonics[service.use_mnemonic],
        rpc: network.rpc,
        gasPrices: `${network.gas_prices}${network.denom}`,
        prefix: extractPrefix(network.addr_grantor)
    })

    const txMsgDelegate = {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: MsgDelegate.encode(
            MsgDelegate.fromPartial({
                delegatorAddress: network.addr_grantor,
                validatorAddress: network.addr_validator,
                amount: {
                    denom: network.denom,
                    amount: `${restaked}`
                }
            })).finish()
    };

    const MsgExec = {
        typeUrl: "/cosmos.authz.v1beta1.MsgExec",
        value: {
            grantee: senderAddress,
            msgs: [txMsgDelegate]
        },
    };

    try {
        let res = await signingClient.signAndBroadcast(senderAddress, [MsgExec], "auto");
        return { chain_id: network.chain_id, res }

    } catch (e) {
        console.log(e)
        return { chain_id: network.chain_id, error: e }
    }
}