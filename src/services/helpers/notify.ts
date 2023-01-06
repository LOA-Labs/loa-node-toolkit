import { IncomingWebhook } from "@slack/webhook";
// import { SendTweetV2Params, TwitterApi, UserV2Result } from 'twitter-api-v2';
import axios from "axios";

const getMsgServices = () => {
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

export default async ({ text, config, service, response_url = null }) => {
  const msgServices: any = getMsgServices();
  const serviceKeys = Object.keys(service.notify);
  const allowBroadcast = false;
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
};

const checkNotificationConfig = ({ config, service, serviceKey }) => {
  const serviceChannel = service.notify?.[serviceKey];
  const notificationConfig =
    config.notifications?.[serviceKey]?.[serviceChannel];
  if (notificationConfig?.active !== true)
    throw new Error(`Notification config not active: ${serviceKey}`);
  else return notificationConfig;
};
