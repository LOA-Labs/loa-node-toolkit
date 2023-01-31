![LNT](https://user-images.githubusercontent.com/9093152/215165214-b69a09cf-10a1-42bc-b3ce-04c997f9c152.png)

Highly configurable and lightweight Nodejs toolkit for monitoring, governing, and financing validator nodes on Cosmos.

[Installation](#installation)

* Nodejs toolset to monitor validator uptime and diskspace, automate rewards and restaking, monitor and vote on governance proposals, websocket watch wallet or validator for transactions. 

* Takes a lightweight approach to node monitoring and automation. Nodejs instance(s) can run on its own node, or on validator node.

* Single instance can monitor multiple chains and connect to multiple notification channels such as Slack, Discord, Telegram, and Twitter.

* Leverages authz to delegate a sub-set of needed authorizations to perform automated tasks. 
​
* Each service runs on its own cron schedule, frequency of checkins and notifications can be customized.

## Monitoring Checks fed into Slack Channel

![Monitoring Checks](https://user-images.githubusercontent.com/9093152/215628279-bafd4c8d-3b3c-49cd-b634-c365fbc13796.png)

## WS Watcher for events that meet your notification thresholds 
![image](https://user-images.githubusercontent.com/9093152/215513855-1490feb7-a0d2-466b-9833-36191f9e8b76.png)

## Automatic Rewards Withdrawals and Restaking Daily Compounding Report
![Auto Rewards and Auto Restaking](https://pitch-assets.imgix.net/c1ae489d-8981-4f56-adce-e517f0b266fb)
​
### Gov Proposal Checks fed into private Slack Channel, also Monitoring alert shown with comment thread
![Proposal Checks](https://pitch-assets.imgix.net/e84e60af-ec08-4f71-bc0a-0251332bdeb2)
​
### Governance Votes Execution with Slack (or Discord) Command from private channel, also gov disccussion in comment thread
![Executing Governance Votes](https://pitch-assets.imgix.net/0bc1edd2-77ac-46cb-b014-2adf1db5339f)

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

The most basic service is Status, so let's begin with there. Under "networks" section, update "name", "chain_id", and "rpc" with your chain/node's information. This are the only three settings required for Status service:
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
```

Once networks, services, and notifications are configured, run:

```
npm run build
​
npm run start
```

### 2. Proposals Service

Edit `configs/default.json`

Set `enabled` to true. Set `run_on_start` to true also for testing.

Default cron is set to check for new government proposals every 15 minutes.

`force_notify_count` is set to send proposal status every 64 checks, which will send every 12 hours regardless of any new proposals. 

`active_notify_count` is set to send proposal status every 16 checks, which will send every 3 hours if there are open proposals of which the validator has not voted.

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

**Note: [Requires Authz](#authz)**

Step-by-step secure voting from within Slack or Discord instructions coming soon.

### 4. Rewards Service

**Note: [Requires Authz](#authz)**

Step-by-step Rewards Claiming and Restaking Service configuration instructions coming soon.

### 5. Distribution Service

**Note: [Requires Authz](#authz)**

Step-by-step auto-funds distribution configuration instructions coming soon.

## Authz

Using authz to give restricted permissions to a bot wallet, many validator tasks can run automatically using the LNT cron service configurations. It is important to set up Authz correctly to maintain asset security even if the bot seed phrase is accidently leaked. The bot seed phrase is used to generate the offline signer which has permissions to execute certain tasks on behalf of the validator. 

Authz grant message [templates are located here](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates).

You may choose the [authz-all.json](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-all.json) template and grant everything the bot account might utilize, or you may wish to break up permissions granuarly:

* [Voting (authz-voting.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-voting.json) - gives permission to create proposals and vote on behalf of granter. This feature can be used to vote from within a private Slack or Discord channel.

* [Managing Validator (authz-managing.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-managing.json) - edit validator info, unjail.

* [Restaking (authz-restaking.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-restaking.json) - withdraw rewards, withdraw commissions, restake. 

* [Sending (authz-sending.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-sending.json) - Important to set sending limits, and even better use with Cosmos SDK v47 [Sending (authz-sending-v47.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/authz-sending-v47.json) with allow_list option. Sending feature can automated distributions of funds to specified wallets.

* [Fee Grant (fee-grant.json)](https://github.com/LOA-Labs/loa-node-toolkit/tree/main/templates/fee-grant.json) - not a part of Authz but an important piece to the automation stack. Fee Grant message is included in all of the authz templates. If Fee Grant is not granted, the bot wallet needs to have funds  periodically added to pay for gas to execute transactions on behalf of validator.

**Authz steps:**

1. Create a new wallet for the bot account and send a tiny amount to it to establish its presnce on chain
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
