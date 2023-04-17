
import { WebsocketClient } from '@cosmjs/tendermint-rpc';
import { LntConfig, NetworkConfig, Service } from "./global.types";
import { notify } from "../helpers/notify";

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
export type RequestFunctionProps = {
  network: NetworkConfig
  id: number
  service: Service
}

let subId = 100;
const websocketClients = [];
export const socketFactory = async (rpc: string): Promise<WebsocketClientObject> => {

  try {
    if (websocketClients[rpc] === null || websocketClients[rpc] === undefined) {

      websocketClients[rpc] = {}
      websocketClients[rpc].client = new WebsocketClient(rpc.split("http").join("ws"), (e) => {
        console.log("WebsocketClient onError caught:", e)
      })

      websocketClients[rpc].subscriptions = {}

      websocketClients[rpc].addSubscription = async ({ key, config, network, service, requestFunction, eventHandler }: addSubscriptionParams) => {
        if (websocketClients[rpc][key] !== undefined) return
        let reqDef = requestFunction({ network, service, id: subId })
        subId++
        console.log(`\nSubscribing to event id ${subId}: ${network.chain_id}, ${key}`)
        console.log(` ${reqDef?.params?.query}`)
        let stream = await websocketClients[rpc].client.listen(reqDef)
        stream.subscribe({
          next: (event: any) => {
            try {
              // console.log(event)
              eventHandler(event, { key, config, network, service, notify })
            } catch (e) {
              console.log("Subscription error caught:", e, event)
            }
          },
          error: (error: any) => {
            console.log("Subscription error:", key, error)
            notify({ text: `Subscription error: ${network.chain_id} ${key} ${JSON.stringify(error)}`, config, service })
          },
          complete: () => {
            console.log(key, "STREAM COMPLETE")
          }
        })
        websocketClients[rpc][key] = true;
      }
    }

    return websocketClients[rpc]
  } catch (e) {
    console.log("Caught error", e)
    return null
  }
}