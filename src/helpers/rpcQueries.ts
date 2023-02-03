import { NetworkConfig } from "./global.types";
import { JsonRpcRequest } from "@cosmjs/json-rpc";
import { icons, microToMacro } from "./utils";
import Report from "./class.report";

export const goodActions = ['/cosmos.staking.v1beta1.MsgDelegate']

export const statusRequest: JsonRpcRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "status",
  params: []
}

export const getReqMsgDelegate = (network: NetworkConfig, id: number): JsonRpcRequest => {
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query: `tm.event = 'Tx' AND message.action='/cosmos.staking.v1beta1.MsgDelegate' AND delegate.validator='${network.valoper}'`
    }
  }
}
export const getReqMsgUnDelegate = (network: NetworkConfig, id: number): JsonRpcRequest => {
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query: `tm.event = 'Tx' AND message.action='/cosmos.staking.v1beta1.MsgUndelegate' AND unbond.validator='${network.valoper}'`
    }
  }
}

export const delegationsEventHandler = (event, { key, config, network, service, notify }): void => {

  let amount = event.events['delegate.amount']?.[0] || event.events['unbond.amount']?.[0] || ""

  if (microToMacro(amount) > service.ws_watchers.delegations.min_amount) {
    console.log(`${microToMacro(amount)} > ${service.ws_watchers.delegations.min_amount} not true. Skipping notification.`)
    return
  }
  let tx = event.events['tx.hash']?.[0]
  let action = event.events['message.action']?.[0]
  let amountAr = amount.split("u")
  let macro = microToMacro(amountAr[0])
  let icon = goodActions.indexOf(action) === -1 ? icons.bad : icons.good
  console.log(network.name, key, event.events)

  const report = new Report()
  report.addRow("*New Event*")
    .addRow(`\`====== ${network.name} ======\``).backticks()
    .addRow(`${icon} ${action}`)
    .addRow(`${macro} ${amountAr[1]}`)
    .addRow(`Tx: ${config.explorer}/${network.name}/txs/${tx}`).backticks()
  notify({ text: report.print(), config, service });
}