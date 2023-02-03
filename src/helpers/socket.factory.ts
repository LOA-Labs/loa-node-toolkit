
import { WebsocketClient } from '@cosmjs/tendermint-rpc';
import { LntConfig, NetworkConfig, Service } from "./global.types";

type addSubscriptionParams = {
  key: string
  config: LntConfig
  network: NetworkConfig
  service: Service
  notify: Function
  requestFunction: Function
  eventHandler: Function
}
export type WebsocketClientObject = {
  client: WebsocketClient
  subscriptions: []
  addSubscription: Function
}



let subId = 0;
const websocketClients = [];
export const socketFactory = (rpc: string): WebsocketClientObject => {
  if (websocketClients[rpc] === null || websocketClients[rpc] === undefined) {
    websocketClients[rpc] = {}
    websocketClients[rpc].client = new WebsocketClient(rpc.split("http").join("ws"))
    websocketClients[rpc].subscriptions = {}
    websocketClients[rpc].addSubscription = ({ key, config, network, service, notify, requestFunction, eventHandler }: addSubscriptionParams) => {
      let reqDef = requestFunction(network, subId)
      subId++
      if (websocketClients[rpc][key] !== undefined) return
      console.log(`Subscribing to event id ${subId}: ${network.chain_id}, ${key}`)
      let stream = websocketClients[rpc].client.listen(reqDef)
      stream.subscribe({
        next: (event: any) => {
          try {
            eventHandler(event, { key, config, network, service, notify })
          } catch (e) {
            console.log("Subscription error caught:", e, event)
          }
        },
        error: (error: any) => {
          console.log("Subscription error:", key, error)
        },
        complete: () => {
          console.log(key, "STREAM COMPLETE")
        }
      })
      websocketClients[rpc][key] = true;
    }
  }
  return websocketClients[rpc]
}