![LNT](https://user-images.githubusercontent.com/9093152/215165214-b69a09cf-10a1-42bc-b3ce-04c997f9c152.png)

Highly configurable and lightweight Nodejs toolkit for monitoring, governing, and financing validator nodes on Cosmos.

[Installation](#installation)

* Nodejs toolset to monitor validator uptime and diskspace, automate rewards and restaking, monitor and vote on governance proposals. 

* Takes a lightweight approach to node monitoring and automation. Nodejs instance(s) can run on its own node, or on validator node.

* Single instance can monitor multiple chains and connect to multiple notification channels such as Slack, Discord, Telegram, and Twitter.

* Leverages authz to delegate a sub-set of needed authorizations to perform automated tasks. 
​
* Each service runs on its own cron schedule, frequency of checkins and notifications can be customized.

### Monitoring Checks fed into Slack Channel
![Monitoring Checks](https://pitch-assets.imgix.net/077a8f6e-0166-4a5d-92d3-c6b6e899c655)
​
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

Step-by-step Authz instructions coming soon.

Also see: [https://docs.cosmos.network/v0.47/modules/authz](https://docs.cosmos.network/v0.47/modules/authz)
