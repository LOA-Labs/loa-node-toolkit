Highly configurable and lightweight Nodejs toolkit for monitoring, governing, and financing validator nodes on Cosmos.

[Installation](#installation)

* Nodejs toolset to monitor validator uptime and diskspace, automate rewards and restaking, monitor and vote on governance proposals. 
​
* Takes a lightweight approach to node monitoring and automation. Nodejs instance(s) can run on its own node, or on validator node.
​
* Single instance can monitor multiple chains and connect to multiple notification channels such as Slack, Discord, Telegram, and Twitter.
​
* Leverages authz to delegate a sub-set of needed authorizations to perform automated tasks. 
​
* Each service runs on its own cron schedule, frequency of checkins and notifications can be customized.
​
## Monitoring Checks fed into Slack Channel
<img width="661" alt="Oszz9ZRWMFU_ZvHJ7vKtrj2H6Ml4bLE4rACcLa4CGIERMJ9ib1wKOE_bVqdsat8PhEc63KkE2PlaxpM3l9R7HP52YL340IglOUHZrCdMAfNmUcrfVplJmHRBUXLX" src="https://user-images.githubusercontent.com/9093152/214908503-4a43fb96-df63-4d5e-ae94-972252bf7423.png">

​
## Automatic Rewards Withdrawals and Restaking Daily Compounding Report
![Auto Rewards and Auto Restaking](https://user-images.githubusercontent.com/9093152/214908668-5fd3bd06-9bd2-4736-bffb-f4f36f954b57.png)

## Gov Proposal Checks fed into private Slack Channel, also Monitoring alert shown with comment thread & Governance Votes Execution with Slack (or Discord) Command from private channel, also gov disccussion in comment thread
![Proposal Checks & Executing Governance Votes](https://user-images.githubusercontent.com/9093152/214908831-1e3acc9a-43fe-4d2d-9c98-8b6c4c06c2a5.png)

​
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

### Status Service

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

### Status service configs:

```
    "status": {
      "enabled": true,
      "run_on_start": true,
      "title": "Status Service",
      //check status every 5 minutes
      "cron": "*/5 * * * *", 
      //notify every 72 checks (every 6 hours)
      "count_force_notify": 72, 
      //channel configs status notifications
      "notify": { 
        "discord": "#node-monitor", 
        "slack": "#node-monitor"
      }
    }
```

### Notification configs:

* Setting up [Discord webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)

* Setting up [Slack webhook](https://api.slack.com/messaging/webhooks)
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

npm run start
```
