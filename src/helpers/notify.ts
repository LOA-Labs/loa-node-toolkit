import { IncomingWebhook } from "@slack/webhook";
import axios from "axios";
import { Command, LntConfig, Service } from "./global.types";

export type NotifyParams = {
  text: string
  config: LntConfig
  service: Service | Command
  response_url?: string | null
}

const getMsgServices = (): object => {
  return {
    discord: {
      method: async ({ notificationConfig, text, broadcast }) => {
        if (broadcast)
          return await axios.post(notificationConfig.endpoint, {
            content: text,
          });
        else return null;
      },
    },
    slack: {
      method: async ({ notificationConfig, text, response_url, broadcast }) => {
        const webhook = new IncomingWebhook(
          notificationConfig.endpoint || response_url
        );
        if (broadcast) return await webhook.send({ text });
        else return null;
      },
    },
  };
};

export const notify = async ({ text, config, service, response_url = null }: NotifyParams): Promise<object[]> => {

  try {
    if (typeof service.notify != "object") throw new Error(`Service notify object not configured.`)
    const msgServices: object = getMsgServices();
    const serviceKeys: string[] = Object.keys(service.notify);
    const allowBroadcast: boolean = false;
    let res = [];

    for (let index = 0; index < serviceKeys.length; index++) {
      let serviceKey: any = serviceKeys[index];

      const msgService = msgServices[serviceKey];

      let broadcast = process.env.NODE_ENV === "production" || allowBroadcast;

      try {
        const notificationConfig = checkNotificationConfig({
          config,
          service,
          serviceKey,
        });
        res.push(
          await msgService.method({
            notificationConfig,
            text,
            serviceKey,
            response_url,
            broadcast,
          })
        );
        console.log(
          `\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n>>> START ${serviceKey} NOTIFICATION\n${text}\n\n<<< END ${serviceKey} NOTIFICATION\n<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n`
        );
      } catch (e) {
        console.log(e.message || e);
        res.push(e.message);
      }
    }

    return res;
  } catch (e) {
    console.log(`Notify Error: ${e.message}`)
    return []
  }
};

const checkNotificationConfig = ({ config, service, serviceKey }) => {
  const serviceChannel = service.notify?.[serviceKey];
  const notificationConfig =
    config.notifications?.[serviceKey]?.[serviceChannel];
  if (notificationConfig?.enabled !== true)
    throw new Error(`Notification enabled must be set to true: ${service.name} ${serviceKey}`);
  else return notificationConfig;
};
