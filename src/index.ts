/* 
LOA LABS Nodejs Toolkit {ia}
index.ts entrypoint
*/

//load env variables defined in .env file
require('dotenv').config()

const package_json = require('../package.json');
import { readdirSync, readFileSync } from 'fs';
import { Cron } from "croner";
import { v4 } from "uuid"

const express = require('express');
import { Request, Response } from 'express';

//cron services
import status from './services/status'
import rewards from './services/rewards'
import proposals from './services/proposals'

//on demand commands
import vote from './services/vote'

const startTime = new Date().toISOString()
const logSpacer = `==============================\n`
console.log(`\n${logSpacer}${logSpacer}LOA Node Toolkit v${package_json.version}\nStart: \t${startTime} \nENV: \t${process.env.NODE_ENV}`)

const jobs: any = [];
const CONFIGS: any = {};

(async () => {
    const SERVICES: any = { status, rewards, proposals, vote }
    const configDir = __dirname + `/../configs/`
    const configFiles = await readdirSync(configDir)

    //implement each json config found in configs folder
    for (let i = 0; i < configFiles.length; i++) {

        const filePath = configDir + configFiles[i]

        try {
            const config: any = JSON.parse(await readFileSync(filePath, 'utf-8'))

            CONFIGS[configFiles[i].split(".").shift()] = config //index and store in memory

            if (config.active === false) continue

            const serviceKeys = Object.keys(config.services)

            //schedule each service active in config
            for (let j = 0; j < serviceKeys.length; j++) {

                const serviceKey = serviceKeys[j]
                const service = config.services[serviceKey];
                service.uuid = v4() //assign each service unique id
                if (service.active === false) continue

                try {
                    if (process.env.NODE_ENV === "production" || config.FORCE_SCHEDULE_CRON) {

                        jobs[j] = new Cron(
                            service.cron,
                            { catch: true },
                            () => {

                                if (config.TEST_CRON_ONLY) {
                                    console.log("TEST_CRON_ONLY is true.", serviceKey)
                                    return
                                }

                                SERVICES[serviceKey]({ ...service }, config)
                            }
                        )

                        console.log(`\nTask ${j} - Cron started: [${config.title}] ${service.title}`)

                        if (service.run_on_start === true) {
                            console.log(`(Running on start)`)
                            SERVICES[serviceKey]({ ...service }, config)
                        }

                    } else {
                        console.log(`\n\t${j} - Service ran: [${config.title}] ${service.title}`)
                        SERVICES[serviceKey]({ ...service }, config)
                    }

                } catch (e) {
                    console.log(`ERROR: Could not run service: ${serviceKey}`, e)
                }
            }
        } catch (e) {
            console.log(`ERROR: Could not read config: ${filePath}`, e)
        }
    }
    startServer()
})()

const startServer = () => {
    const app = express()
    const port = 4040

    app.use(express.urlencoded({
        extended: true
    }))

    app.post('/vote', async (req: Request, res: Response) => {

        try {
            let config: any = null

            if (req?.body?.channel_id) {
                //channel id should defined to increase security, check channel id in request
                const [filename, configData] = getCommandConfigBy(CONFIGS, {
                    credentialsKey: "channel_id",
                    value: req?.body?.channel_id,
                    command: "vote"
                })
                config = configData
            } else {
                config = CONFIGS[req.query.config]
            }

            if (config) {
                res.status(200).send("Processing request...");
                return await vote({ req, config })
            } else throw new Error("No config. Could not Process request.")

        } catch (e) {
            console.log("VOTE ERROR",e)
            res.status(400).send(e.message || e);
        }
    })

    app.listen(port, () => {
        console.log(`\n${logSpacer} LOA Monitor listening for commands on port ${port}`)
        Object.entries(CONFIGS).map(([key, object]: any) => {
            console.log(`\n\tConfig ${object.active ? 'ACTIVE' : 'inactive'}: ${key}`)
            if (object.active) {
                Object.entries(object.commands).map(([cmdKey, cmdObj]: any) => {
                    console.log(`\n\t- Command ${cmdObj.active ? 'ACTIVE' : 'inactive'}: ${cmdKey}`)
                })
            }

        })
    });

}

export const getCommandConfigBy = (CONFIGS, { credentialsKey, value, command }) => {
    return Object.entries(CONFIGS).find(([_, config]: any) => {
        let credentials = config?.commands?.[command]?.credentials?.[credentialsKey]
        let credentialsAr = Array.isArray(credentials) ? credentials : [credentials]
        return credentialsAr.indexOf(value) !== -1 && config.active
    }) || [null,null]
}
