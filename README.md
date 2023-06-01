![LNT](https://user-images.githubusercontent.com/9093152/215165214-b69a09cf-10a1-42bc-b3ce-04c997f9c152.png)

Highly configurable and lightweight Nodejs toolkit for monitoring, governing, and financing validator nodes on Cosmos.

[Installation](#installation)

* Nodejs toolset to monitor validator uptime and diskspace, automate rewards and restaking, monitor and vote on governance proposals, websocket watch wallet or validator for transactions. 

* Takes a lightweight approach to node monitoring and automation. Nodejs instance(s) can run on its own node, or on validator node.

* Single instance can monitor multiple chains and connect to multiple notification channels such as Slack, Discord, Telegram, and Twitter.

* Leverages authz to delegate a sub-set of needed authorizations to perform automated tasks. 
​
* Each service runs on its own cron schedule, frequency of check-ins and notifications can be customized.

### Monitoring Checks fed into Slack Channel
![Monitoring Checks](https://user-images.githubusercontent.com/9093152/215628279-bafd4c8d-3b3c-49cd-b634-c365fbc13796.png)

### WS Watchers for events that meet notification thresholds 
![image](https://user-images.githubusercontent.com/9093152/215513855-1490feb7-a0d2-466b-9833-36191f9e8b76.png)

### Automatic Rewards Withdrawals and Restaking Daily Compounding Report
![Auto Rewards and Auto Restaking](https://user-images.githubusercontent.com/9093152/214908668-5fd3bd06-9bd2-4736-bffb-f4f36f954b57.png)
​
### Gov Proposal Checks fed into private Slack Channel, also Monitoring alert shown with comment thread and Governance Votes Execution with Slack (or Discord) Command from private channel, also gov disccussion in comment thread
![Proposal Checks](https://user-images.githubusercontent.com/9093152/214908831-1e3acc9a-43fe-4d2d-9c98-8b6c4c06c2a5.png)

## Installation
​
System requirements
```
node ^18.7.0 
npm ^8.18.0
```
​
Checkout and install
```
git clone https://github.com/LOA-Labs/loa-node-toolkit.git
​
cd loa-node-toolkit

npm install
```

Configure (use your favorite editor)
```
vim configs/default.json
```

### 1. Status Service

The most basic service is Status, so let's begin with it. It pings node to check status using a cron interval, default is set to check every 5 minutes.

Under "networks" section, update "name", "chain_id", and "rpc" with your chain/node's information. 

This are the only three settings required for Status service:
```
    {
      "name": "regen",
      "chain_id": "regen-1",
      "rpc": "http://127.0.0.1:26657"
    }
```

If not enabled already, you'll need to open your node's RPC port:

Edit your node's `.<chain-daemon-name>/config/config.toml`

The default is 127.0.0.1, you may wish to change to your node's IP address or to 0.0.0.0
```
# TCP or UNIX socket address for the RPC server to listen on
laddr = "tcp://127.0.0.1:26657"
```

After restarting your node, http://<IP address>:26657 should now show the default list of available RPC queries. 

If you do not wish your RPC server to be public, you can use UFW firewall to allow access to only your known IP addresses. 

**Status service configs:**
```
    "status": {
      "enabled": true,
      "run_on_start": true,
      "title": "Status Service",
      //check status every 5 minutes
      "cron": "*/5 * * * *", 
      //notify every 72 checks (every 6 hours)
      "force_notify_count": 72, 
      //channel configs status notifications
      "notify": { 
        "discord": "#node-monitor", 
        "slack": "#node-monitor"
      }
    }
```

**Notification configs:**
Setting up [Discord webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
Setting up [Slack webhook](https://api.slack.com/messaging/webhooks)
```
"notifications": {
    "discord": {
      "#node-monitor": {
        "enabled": true,
        "endpoint": "https://discord.com/api/webhooks/<12345678>/<12345678>"
      }
    },
    "slack": {
      "#node-monitor": {
        "enabled": true,
        "endpoint": "https://hooks.slack.com/services/<12345678>/<12345678>/<12345678>"
      }
    }
}
```

Once networks, services, and notifications are configured, run:

```
npm run build
​
npm run start
```

### 2. Proposals Service

This service sends notifications to a Sla ck or Discord channel when there are new governance proposals. Its purpose is not let you forget to cast a vote; it sends repeated notifications until the vote has been cast.

Edit `configs/default.json`

Set `enabled` to true. Set `run_on_start` to true also for testing.

Default cron is set to check for new government proposals every 15 minutes.

`force_notify_count` is set to send proposal status every 64 checks, which will send every 12 hours regardless of any new proposals. A peace of mind.

`active_notify_count` is set to send proposal status every 16 checks, which will send every 3 hours if there are open proposals of which the validator has not voted. Using the Vote Command to vote already! 

Notify is set here to same `#node-monitor` channel configuration, but sending proposal notices to a different channel is also possible.

```
    "proposals": {
      "enabled": true,
      "run_on_start": true,
      "title": "Proposal Check",
      "cron": "*/15 * * * *",
      "force_notify_count": 64,
      "active_notify_count": 16,
      "notify": {
        "slack": "#node-monitor",
        "discord": "#node-monitor"
      }
    }
```


### 3. Vote Command

This command allows you to easily submit a vote transaction from within Slack or Discord messaging app. 

**Note: [Requires Authz](#authz)**

1. Create a grantee bot account with voting authorization to vote on behalf of the grantor validator account. You can use the [Governance Messages Template](https://github.com/LOA-Labs/loa-node-toolkit/blob/main/templates/authz-governance.json). You can follow the [Authz](#authz) instructions below.

2. Enable the vote command in the `commands` section. You can set the command to use the specific 'voter' mnemonic, or a general bot account that has been granted many types of permissions. If you wish to add more security on who can vote from Slack or Discord channel, you may add allowed `channel_id` strings as an array, and/or allowed `user_id` strings. 

We allow voting from within the same channel that the proposal notices are sent.

3. Set the `notify` channels where voting result should be sent.

```
    "vote": {
      "enabled": false,
      "title": "Voting",
      "use_mnemonic": "voter",
      "credentials": {
        "channel_id": [
          "12345678",
          "12345678"
        ]
      },
      "notify": {
        "slack": "#node-monitor",
        "discord": "#node-monitor"
      }
    }
```

4. When LNT is built with this configuration enabled, it will log the port that the expressjs server is listening on for receiving commands from Slack or Discord.

Slash Command format from Slack is `/vote <netowrks.chain_id> <prop#> <yes|no|nowithveto|abstain> [| Note about vote decision]`

See this resource to set up [Slack Slash Commands](https://api.slack.com/interactivity/slash-commands)

### 4. Rewards Service

This service is used to withdraw staking and commission rewards, and restake a percentage of those rewards all on an automatic schedule.

**Note: [Requires Authz](#authz)**

1. Enable the rewards feature by setting to `true`. The default cron is set on to run at the 12th UTC hour every day.

2. The [Restaking Template](https://github.com/LOA-Labs/loa-node-toolkit/blob/main/templates/authz-restaking.json). After granting the necessary permissions, or by using a general bot, set the label of bot mnemonic that should be used. 

```
    "rewards": {
      "enabled": true,
      "run_on_start": false,
      "title": "Daily Rewards Report",
      "cron": "0 12 * * *",
      "use_mnemonic": "asset_manager",
      "notify": {
        "slack": "#node-monitor",
        "discord": "#node-monitor"
      }
    }
```

3. By default, restaking will not happen during the withdraw rewards process. Restaking must be set individually on each network.

In the `networks` section, the `restake` parameter must be set. It takes a float representation of a percentage. 0.5 = 50% restake. The restaking amount is based on the amount of rewards withdrawn and not the full wallet balance; this is to ensure that the wallet balance is never drained unintentionally.

```
"networks": [
    {
      "name": "regen",
      "chain_id": "regen-1",
      "rpc": "http://127.0.0.1:26657",
      "coingecko_id": "regen",
      "denom": "uregen",
      "gas_prices": "0.025",
      "gas_auto": true,
      "granter": "regen1...",
      "valoper": "regenvaloper1...",
      "restake": 0.5
    }
]
```

4. Rebuild and restart LNT.

### 5. Distribution Service

This service automatically sends funds broken down by percentages to various wallet addresses.

**Be very careful with this one!** Granting bank send permissions adds risk to validator funds if the seed phrase for the bot account is exposed.

To help mitigate this risk: 
  * Be sure to correctly set a limit for the amount of funds that can be send per day, and/or:
  * Wait until Cosmos SDK v0.47 is available on your chain, which allows you to add an `allow_list` of wallets that the bot account may send funds to.

**Note: [Requires Authz](#authz)**

1. The templates for sending are [Sending Template](https://github.com/LOA-Labs/loa-node-toolkit/blob/main/templates/authz-sending.json) and [Sending Template v0.47](https://github.com/LOA-Labs/loa-node-toolkit/blob/main/templates/authz-sending-v47.json)

2. Set distribution enabled to true. By default, the cron is set to run 10 minutes after the rewards have been withdrawn/restaking. Distribution should run after rewards withdrawn/restaking has completed. 

```
    "distribution": {
      "enabled": true,
      "run_on_start": false,
      "title": "Daily Distribution",
      "cron": "10 12 * * *",
      "use_mnemonic": "asset_manager",
      "notify": {
        "slack": "#node-monitor"
      }
    }
```

3. Distribution amounts must be set individually on each network. Distribution is based on the current account balance. Thus, percentage total of distributions must be less than 100% or the account will be emptied of funds.

```
"networks": [
    {
      "enabled": true,
      "name": "regen",
      ...
      "restake": 0.5,
      "distribution": [
        {
          "addr": "regen1a...",
          "allocation": 0.48
        },
        {
          "addr": "regen1b...",
          "allocation": 0.48
        }
      ]
    }
]
```


## Authz

Using authz to give restricted permissions to a bot wallet, many validator tasks can run automatically using the LNT cron service configurations. It is important to set up Authz correctly to maintain asset security even if the bot seed phrase is accidentally leaked. The bot seed phrase is used to generate the offline signer which has permissions to execute certain tasks on behalf of the validator. 

Authz grant message [templates are located here](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates).

You may choose the [authz-all.json](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-all.json) template and grant everything the bot account might utilize, or you may wish to break up permissions granularly:

* [Voting (authz-voting.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-voting.json) - gives permission to create proposals and vote on behalf of granter. This feature can be used to vote from within a private Slack or Discord channel.

* [Managing Validator (authz-managing.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-managing.json) - edit validator info, unjail.

* [Restaking (authz-restaking.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-restaking.json) - withdraw rewards, withdraw commissions, restake. 

* [Sending (authz-sending.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-sending.json) - Important to set sending limits, and even better use with Cosmos SDK v47 [Sending (authz-sending-v47.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-sending-v47.json) with allow_list option. Sending feature can automated distributions of funds to specified wallets.

* [Fee Grant (fee-grant.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/fee-grant.json) - not a part of Authz but an important piece to the automation stack. Fee Grant message is included in all of the authz templates. If Fee Grant is not granted, the bot wallet needs to have funds  periodically added to pay for gas to execute transactions on behalf of validator.

**Authz steps:**

1. Create a new wallet for the bot account and send a tiny amount to it to establish its presence on chain
2. Add the bot account seed phrase to the config file
3. Using one of the Authz json templates:
- replace the grantee fields with the bot account's bech32 address
- replace the grater fields with the validator's bech32 address
- replace the denoms with target chain's denom
- adjust any other configurations
4. Using the CLI execute `<daemon> tx sign <authz-template.json> --from <validator bech32> > signed-authz-template.json`
5. Then broadcast `<daemon> tx broadcast signed-authz-template.json --from <validator bech32>`
6. You can check which authz permissions have been granted with `<daemon> q authz grants-by-grantee <bot account's bech32>`
7. You can fee grant with `<daemon> q feegrant grants-by-grantee <bot account's bech32>`

Also see: [https://docs.cosmos.network/v0.47/modules/authz](https://docs.cosmos.network/v0.47/modules/authz)


## NOTICE PER [GPL-3.0 license](https://github.com/LOA-Labs/loa-node-toolkit/blob/main/LICENSE)

Software provided "As Is". The entire risk of using this software is with you. 

THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY
APPLICABLE LAW.  EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT
HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY
OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE.  THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM
IS WITH YOU.  SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF
ALL NECESSARY SERVICING, REPAIR OR CORRECTION.
