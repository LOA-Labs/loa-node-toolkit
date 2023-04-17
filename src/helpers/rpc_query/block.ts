import { JsonRpcRequest } from "@cosmjs/json-rpc";
import { RequestFunctionProps } from "../socket.factory";

import { Service, LntConfig, NetworkConfig } from "../global.types";

export const getNewBlock = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query: `tm.event = 'NewBlock'`
    }
  }
}


// For each chain keep an interval running, alert 
// if latest block exceeds a certain time
class IntervalChecker {
  latest_block_time_tolerance: number = 20000
  key: string
  config: LntConfig
  network: NetworkConfig
  service: Service
  notify: Function
  interval: any
  latest_block_time: number

  constructor({ key, config, network, service, notify }) {
    this.key = key
    this.config = config
    this.network = network
    this.service = service
    this.notify = notify

    this.latest_block_time_tolerance = network.latest_block_time_tolerance || this.latest_block_time_tolerance
    this.interval = setInterval(() => {
      let dif = new Date().getTime() - this.latest_block_time
      if (dif > this.latest_block_time_tolerance) {
        notify({ text: `🔴 [${this.network.chain_id}] Latest Block Exceeds ${this.latest_block_time_tolerance / 1000}s (${Math.ceil(dif / 1000)}s)`, config: this.config, service: this.service })
      }
    }, this.latest_block_time_tolerance)
  }
  reset() {
    this.latest_block_time = new Date().getTime()
  }
}
const blockTimeouts = {}



export const getNewBlockEventHandler = (event, { key, config, network, service, notify }): void => {
  // keep store of last block time by chain_id
  if (blockTimeouts[network.chain_id] == undefined) {
    blockTimeouts[network.chain_id] = new IntervalChecker({ key, config, network, service, notify })
  }
  blockTimeouts[network.chain_id].reset()

  console.log(`\n============================\nBLOCK ${key} ${network.chain_id} ${event.data.value.block.header.height}`)
  // console.log(event.data.value.block.header.time)
  // console.log(event.events['proposer_reward.validator'])
  // console.log(event.events['liveness.missed_blocks'])

}


export const getVoteEvent = ({ network, id, service }: RequestFunctionProps): JsonRpcRequest => {
  return {
    jsonrpc: "2.0",
    id,
    method: "subscribe",
    params: {
      query: `tm.event = 'Vote'`
    }
  }
}

export const getVoteEventHandler = (event, { key, config, network, service, notify }): void => {
  // console.log(`\n\n\n============================\nVOTE ${key}`)
  // console.log(event.data)

}


