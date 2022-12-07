# LOA Labs Node Toolkit

Highly configurable and lightweight Nodejs toolkit for monitoring, governing, and financing validator nodes on Cosmos.

- Nodejs toolset to monitor validator uptime and diskspace, automate rewards and restaking, monitor and vote on governance proposals.

- Takes a lightweight approach to node monitoring and automation. Nodejs instance(s) can run on its own node, or on validator node.

- Single instance can monitor multiple chains and connect to multiple notification channels such as Slack, Discord, Telegram, and Twitter.

- Leverages authz to delegate a sub-set of needed authorizations to perform automated tasks.

- Each service runs on its own cron schedule, frequency of checkins and notifications can be customized.

# Install and run instructions

Checkout repo (or fork to your own repo)

```
git clone git@github.com:LOA-Labs/loa-node-toolkit.git
```

Run npm install (`using node v19.1.0 (npm v9.1.2)`)

```
cd loa-node-toolkit
npm install
```

Local testing and development (`using nodemon 2.0.19` can be installed globally with `npm install -g nodemon`)

```
npm run dev
```

Build for production

```
npm run build
```

Start the monitor (see configuation file below)

```
npm run start
```

# Screenshots

## Monitoring Checks fed into Slack Channel

![Monitoring Checks](https://pitch-assets.imgix.net/077a8f6e-0166-4a5d-92d3-c6b6e899c655)

## Automatic Rewards Withdrawals and Restaking Daily Compounding Report

![Auto Rewards and Auto Restaking](https://pitch-assets.imgix.net/c1ae489d-8981-4f56-adce-e517f0b266fb)

## Gov Proposal Checks fed into private Slack Channel, also Monitoring alert shown with comment thread

![Proposal Checks](https://pitch-assets.imgix.net/e84e60af-ec08-4f71-bc0a-0251332bdeb2)

## Governance Votes Execution with Slack (or Discord) Command from private channel, also gov disccussion in comment thread

![Executing Governance Votes](https://pitch-assets.imgix.net/0bc1edd2-77ac-46cb-b014-2adf1db5339f)

# Configuration

- One or more JSON config files can be placed in /configs folder
- If needed, multiple cron and notification configurations can run simultaneously
- See [Installing Slack App](https://api.slack.com) for adding app and setting up Incoming Webhooks for each channel that will receive notices, and slash commands for sending commands to the node monitor

Sample Config

```
{
    "title": "DEFAULT CONFIG",
    "active": true,
    "TEST_CRON_ONLY": false,
    "FORCE_SCHEDULE_CRON": true,
    "services": {
        "status": {
            "active": true,
            "run_on_start": true, //if true, will not wait for first cron interval
            "title": "Status Service",
            "cron": "*/10 * * * *", //runs every 10 minutes
            "count_force_notify": 36, //every 36 * 10 minutes send a forced notification (checkin)
            "notify": {
                "discord": "#node-monitor",
                "slack": "#node-monitor"
            }
        },
        "rewards": {
            "active": true,
            "run_on_start": false,
            "title": "Daily Rewards Report",
            "cron": "0 12 * * *",
            "use_mnemonic": "asset_manager",
            "notify": {
                "slack": "#node-monitor",
                "discord": "#node-monitor"
            }
        },
        "proposals": {
            "active": true,
            "run_on_start": true,
            "title": "Proposal Check",
            "cron": "15 * * * *",
            "count_force_notify": 12,
            "count_active_notify": 6,
            "notify": {
                "slack": "#gov-monitor",
                "discord": "#gov-monitor"
            }
        }
    },
    "commands": {
        "vote": {
            "active": true,
            "title": "Voting",
            "use_mnemonic": "voter",
            "credentials": { //optional. restrict to commands originating from specific channels
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
    },
    "grantee_mnemonics": {
        "asset_manager": "<mnemonic of grantee with narrow authz priviledges to execute necessary claim rewards and restake>",
        "voter": "<mnemonic of grantee with narrow authz priviledges to execute vote>"
    },
    "notifications": {
        "discord": {
            "#gov-monitor": {
                "active": true,
                "endpoint": "https://discord.com/api/webhooks/<12345678>/<12345678>"
            },
            "#node-monitor": {
                "active": true,
                "endpoint": "https://discord.com/api/webhooks/<12345678>/<12345678>"
            },
            "private-direct": {
                "active": true,
                "endpoint": "https://hooks.slack.com/services/<12345678>/<12345678>"
            }
        },
        "slack": {
            "#gov-monitor": {
                "active": true,
                "endpoint": "https://hooks.slack.com/services/<12345678>/<12345678>/<12345678>"
            },
            "#node-monitor": {
                "active": true,
                "endpoint": "https://hooks.slack.com/services/<12345678>/<12345678>/<12345678>"
            },
            "private-direct": {
                "active": true,
                "endpoint": "https://hooks.slack.com/services/<12345678>/<12345678>/<12345678>"
            }
        }
    },
    "price_api": "https://api-utility.cosmostation.io/v1/market/prices",
    "networks": [{
            "name": "regen",
            "chain_id": "regen-1",
            "denom": "uregen",
            "gas_prices": "0.015",
            "lcd_monitoring": "http://<node-address>:<port>",
            "lcd_disk": "http://<node-address>:<port>/disk?disk=/mnt/<volume-name>",
            "lcd_leading": "http://<node-address>:<port>",
            "rpc": "http://public-rpc.regen.vitwit.com:26657",
            "explorer": "https://www.mintscan.io",
            "addr_grantor": "regen1...",
            "addr_validator": "regenvaloper1...",
            "restake": 0.5
        },
        {
            "name": "gravity-bridge",
            "chain_id": "gravity-bridge-3",
            "gas_prices": "0.015",
            "denom": "ugraviton",
            "lcd_monitoring": "http://<node-address>:<port>",
            "lcd_disk": "http://<node-address>:<port>/disk?disk=/mnt/<volume-name>",
            "lcd_leading": "http://<node-address>:<port>",
            "rpc": "https://gravitychain.io:26657",
            "explorer": "https://www.mintscan.io",
            "addr_grantor": "gravity1...",
            "addr_validator": "gravityvaloper1...",
            "restake": 0.5
        }
    ]
}
```
