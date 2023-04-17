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
import Report from "./helpers/class.report";
const report = new Report();

//server
import runServer from './server'

//cron services
import status from './services/status'
import rewards from './services/rewards'
import proposals from './services/proposals'
import distribution from './services/distribution'

//ws services
import watcher from './services/watcher'

//types
import { LntConfig, Service } from './helpers/global.types';
import { icons } from './helpers/utils';

try {
  const startTime = new Date().toISOString()

  report.header(`LOA Node Toolkit v${package_json.version}\nStart: \t${startTime} \nENV: \t${process.env.NODE_ENV}`)

  const jobs: Cron[] = [];
  const CONFIGS: LntConfig[] = [];



  (async () => {

    const SERVICES = { status, watcher, rewards, proposals, distribution }
    const configDir: string = __dirname + `/../configs/`
    const configFiles: string[] = await readdirSync(configDir)

    //start services
    //implement each json config found in configs folder
    for (let i = 0; i < configFiles.length; i++) {

      const filePath: string = configDir + configFiles[i]

      let config: LntConfig

      try {
        config = JSON.parse(await readFileSync(filePath, 'utf-8'))
      } catch (e) {
        console.log(`ERROR: Could not read config: ${filePath}`)
        continue
      }

      try {

        CONFIGS[configFiles[i].split(".").shift()] = config //index and store in memory

        if (config.enabled === false) {
          report.section(`${icons.bad} Config Not Enabled: ${filePath}\n`)
          continue
        }

        report.section(`${icons.good} Config Enabled: ${filePath}\n`)

        const serviceKeys: string[] = Object.keys(config.services)

        //schedule each service enabled in config
        //no large queries, n^2 should be ok here
        let taskCount = 0
        for (let j = 0; j < serviceKeys.length; j++) {

          const serviceKey = serviceKeys[j]
          const service: Service = config.services[serviceKey];
          if (service.enabled === false) {
            report.addRow(`${icons.bad} [${serviceKey}] Service Not Enabled.`)
            continue
          }

          report.addRow(`${icons.good} [${serviceKey}] Service Enabled.`)

          service.uuid = v4() //assign each service unique id

          try {
            if (process.env.NODE_ENV === "production" || config.debug.SCHEDULE_CRON) {

              if (service.cron) {
                jobs[j] = new Cron(
                  service.cron,
                  { catch: true },
                  () => {

                    if (config.debug.TEST_CRON_ONLY) {
                      report.addRow(`debug.TEST_CRON_ONLY is true. ${serviceKey}`)
                      return
                    }

                    SERVICES[serviceKey]({ ...service }, config)
                  }
                )

                report.addRow(`  * Task ${taskCount} - Cron started: ${config.title} ${service.title}`)
                taskCount++
              }

              if (service.run_on_start === true) {
                report.appendRow(` (Running on start)`)
                SERVICES[serviceKey]({ ...service }, config)
              }

            }

          } catch (e) {
            console.log(`ERROR: Could not run service: ${serviceKey}`, e)
          }
        }
      } catch (e) {
        console.log(`Caught error:`, e)
      }
    }

    console.log(report.print())

    //start server to recieve commands
    runServer(CONFIGS)
  })()

} catch (e) {
  console.log("Caught top level error.", e)
}