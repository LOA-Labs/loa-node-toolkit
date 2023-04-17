
import { JsonRpcRequest } from "@cosmjs/json-rpc";
import { icons, macroToMicro, microToMacro } from "../utils";
import Report from "../class.report";
import { RequestFunctionProps } from "../socket.factory";

export const goodActions = ['/cosmos.staking.v1beta1.MsgDelegate']

export const getReqMsgDelegate = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  let microAmount = `${macroToMicro(service.query?.delegate?.min_amount || 25)}`
  const query = `tm.event = 'Tx' AND message.action='/cosmos.staking.v1beta1.MsgDelegate' AND delegate.validator='${network.valoper}' AND delegate.amount >= ${microAmount}`
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query
    }
  }
}
export const getReqMsgUndelegate = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  let microAmount = `${macroToMicro(service.query?.delegate?.min_amount || 25)}`
  const query = `tm.event = 'Tx' AND message.action='/cosmos.staking.v1beta1.MsgUndelegate' AND unbond.validator='${network.valoper}' AND unbond.amount >= ${microAmount}`
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query
    }
  }
}

export const delegationsEventHandler = (event, { key, config, network, service, notify }): void => {
  let amount = event.events['delegate.amount']?.[0] || event.events['unbond.amount']?.[0] || ""
  let tx = event.events['tx.hash']?.[0]
  let action = event.events['message.action']?.[0]
  let macroAmount = microToMacro(amount)
  let macroDenom = network.denom.replace(/^\w/, '') //remove first char from denom
  let icon = goodActions.indexOf(action) === -1 ? icons.bad : icons.good
  const report = new Report()
  report.addRow("*New Delegation Event*")
    .addRow(`\`====== ${network.name} ======\``).backticks()
    .addRow(`${icon} ${action}`)
    .addRow(`${macroAmount} ${macroDenom}`)
    .addRow(`Tx: ${config.explorer}/${network.name}/txs/${tx}`).backticks()
  notify({ text: report.print(), config, service });
}

export const getReqMsgDelegateWhale = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  let microAmount = `${macroToMicro(service.query?.delegate_whale?.min_amount || 10000)}`
  const query = `tm.event = 'Tx' AND message.action='/cosmos.staking.v1beta1.MsgDelegate' AND delegate.amount >= ${microAmount}`
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query
    }
  }
}
export const getReqMsgUndelegateWhale = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  let microAmount = `${macroToMicro(service.query?.delegate_whale?.min_amount || 10000)}`
  const query = `tm.event = 'Tx' AND message.action='/cosmos.staking.v1beta1.MsgUndelegate' AND unbond.amount >= ${microAmount}`
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query
    }
  }
}

export const delegationsEventHandlerWhale = (event, { key, config, network, service, notify }): void => {
  let amount = event.events['delegate.amount']?.[0] || event.events['unbond.amount']?.[0] || ""
  let tx = event.events['tx.hash']?.[0]
  let action = event.events['message.action']?.[0]
  let macroAmount = microToMacro(amount)
  let macroDenom = network.denom.replace(/^\w/, '') //remove first char from denom
  let icon = goodActions.indexOf(action) === -1 ? icons.bad : icons.good
  const report = new Report()
  report.addRow("*New 🐳 Delegation*")
    .addRow(`\`====== ${network.name} ======\``).backticks()
    .addRow(`${icon} ${action}`)
    .addRow(`${macroAmount} ${macroDenom}`)
    .addRow(`Tx: ${config.explorer}/${network.name}/txs/${tx}`).backticks()
  notify({ text: report.print(), config, service });
}