import { JsonRpcRequest } from "@cosmjs/json-rpc";
import { icons, macroToMicro, microToMacro } from "../utils";
import Report from "../class.report";
import { RequestFunctionProps } from "../socket.factory";

export const getReqMsgSendBySpender = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  let min_amount = ''
  if (service.query?.send?.min_amount) {
    let microAmount = `${macroToMicro(service.query?.send?.min_amount)}`
    min_amount = service.query?.send?.min_amount ? ` AND coin_spent.amount >= ${microAmount}` : ''
  }
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query: `tm.event = 'Tx' AND message.action='/cosmos.bank.v1beta1.MsgSend' AND coin_spent.spender='${network.granter}'${min_amount}`
    }
  }
}

export const getReqMsgSendByReceiver = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  let min_amount = ''
  if (service.query?.send?.min_amount) {
    let microAmount = `${macroToMicro(service.query?.send?.min_amount)}`
    min_amount = service.query?.send?.min_amount ? ` AND coin_received.amount >= ${microAmount}` : ''
  }
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query: `tm.event = 'Tx' AND message.action='/cosmos.bank.v1beta1.MsgSend' AND coin_received.spender='${network.granter}'${min_amount}`
    }
  }
}
export const sendEventHandler = (event, { key, config, network, service, notify }): void => {

  let amount = event.events['coin_received.amount']?.[0] || event.events['coin_spent.amount']?.[0] || ""

  let tx = event.events['tx.hash']?.[0]
  let action = event.events['message.action']?.[0]
  let macroAmount = microToMacro(amount)
  let macroDenom = network.denom.replace(/^\w/, '') //remove first char from denom
  let icon = icons.bad
  const report = new Report()
  report.addRow("*New Send Event*")
    .addRow(`\`====== ${network.name} ======\``).backticks()
    .addRow(`${icon} ${action}`)
    .addRow(`${macroAmount} ${macroDenom}`)
    .addRow(`Tx: ${config.explorer}/${network.name}/txs/${tx}`).backticks()
  notify({ text: report.print(), config, service });
}


export const getReqMsgSendWhale = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {

  let min_whale_amount = service.query?.send_whale?.min_amount || 10000
  let microAmount = `${macroToMicro(min_whale_amount)}`
  const query = `tm.event = 'Tx' AND message.action='/cosmos.bank.v1beta1.MsgSend' AND coin_received.amount >= ${microAmount}`
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query
    }
  }
}

export const sendEventHandlerWhale = (event, { key, config, network, service, notify }): void => {

  try {
    let amount = ""
    //all transfer amounts returned, such as gas and fees, find the largest
    if (Array.isArray(event.events['transfer.amount'])) {
      amount = event.events['transfer.amount'].reduce((a, b) => {
        let aMacro = microToMacro(a)
        let bMacro = microToMacro(b)
        return Math.max(aMacro, bMacro)
      })

    }
    console.log("amount", amount)
    //smart contracts with other denom swaps trigger this query
    if (amount <= service.queries.send_whale.min_amount) return

    // console.log(event.events)
    let tx = event.events['tx.hash']?.[0]
    let action = event.events['message.action']?.[0]
    let macroDenom = network.denom.replace(/^\w/, '') //remove first char from denom
    let icon = icons.bad
    const report = new Report()
    report.addRow("*🐳 New Whale Event!*")
      .addRow(`\`====== ${network.name} ======\``).backticks()
      .addRow(`${icon} ${action}`)
      .addRow(`${amount} ${macroDenom}`)
      .addRow(`Tx: ${config.explorer}/${network.name}/txs/${tx}`).backticks()
    notify({ text: report.print(), config, service });
  } catch (e) {
    console.log("Caught error sendEventHandlerWhale", e)
  }
}