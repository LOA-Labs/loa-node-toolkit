
import { serviceFiltered } from "../helpers/utils";
import { LntConfig, NetworkConfig, Service } from "../helpers/global.types";
import { socketFactory, WebsocketClientObject } from "../helpers/socket.factory";
import { delegationsEventHandler, delegationsEventHandlerWhale, getReqMsgDelegate, getReqMsgDelegateWhale, getReqMsgUndelegate, getReqMsgUndelegateWhale } from "../helpers/rpc_query/delegate";
import { getReqMsgSendByReceiver, getReqMsgSendBySpender, getReqMsgSendWhale, sendEventHandler, sendEventHandlerWhale } from "../helpers/rpc_query/send";
import { notify } from "../helpers/notify";

const localWatcherTesting = true;

export default async (service: Service, config: LntConfig): Promise<boolean> => {

  for (let index = 0; index < config.networks.length; index++) {

    const network: NetworkConfig = config.networks[index];
    if (serviceFiltered("watcher", network) || network?.enabled === false) continue;

    console.log(`\nWatcher services ${network.chain_id}:`)
    if (process.env.NODE_ENV == "production" || localWatcherTesting) {
      try {
        const WS: WebsocketClientObject = await socketFactory(network.rpc)
        ////////////////////////////////////////////////////
        //add delegate subscriptions
        if (service.query?.delegate?.enabled === true) {
          WS.addSubscription({ key: "_getReqMsgDelegate", config, network, service, requestFunction: getReqMsgDelegate, eventHandler: delegationsEventHandler })
          WS.addSubscription({ key: "_getReqMsgUnDelegate", config, network, service, requestFunction: getReqMsgUndelegate, eventHandler: delegationsEventHandler })
        }
        if (service.query?.delegate_whale?.enabled === true) {
          WS.addSubscription({ key: "_getReqMsgDelegateWhale", config, network, service, requestFunction: getReqMsgDelegateWhale, eventHandler: delegationsEventHandlerWhale })
          WS.addSubscription({ key: "_getReqMsgUndelegateWhale", config, network, service, requestFunction: getReqMsgUndelegateWhale, eventHandler: delegationsEventHandlerWhale })
        }
        ////////////////////////////////////////////////////
        //add send/receive subscriptions
        if (service.query?.send?.enabled === true) {
          WS.addSubscription({ key: "_getReqMsgSendBySpender", config, network, service, requestFunction: getReqMsgSendBySpender, eventHandler: sendEventHandler })
          WS.addSubscription({ key: "_getReqMsgSendByReceiver", config, network, service, requestFunction: getReqMsgSendByReceiver, eventHandler: sendEventHandler })
        }
        if (service.query?.send_whale?.enabled === true) {
          WS.addSubscription({ key: "_getReqMsgSendWhale", config, network, service, requestFunction: getReqMsgSendWhale, eventHandler: sendEventHandlerWhale })
        }

      } catch (e) {
        console.log("Caught watcher error", e)
      }
    }
  }


  await notify({ text: `👀 ${service.title} Running\n${JSON.stringify(service.query)}`, config, service });
  return true
}
