const express = require('express');
import { Request, Response, Next } from "express";
import Report from "./helpers/class.report";
const report = new Report();

//on demand commands
import vote from './commands/vote/handler';
import { LntConfig } from "./helpers/global.types";

export default (CONFIGS: LntConfig[]) => {
  const app = express()
  const port = 4040

  app.use(express.urlencoded({
    extended: true
  }))

  app.use((req: Request, res: Response, next: Next) => {
    res.locals.CONFIGS = CONFIGS
    next();
  });

  app.use('/vote', vote);

  app.listen(port, () => {

    report.header(`Listening for commands on port ${port}`)
    Object.entries(CONFIGS).map(([key, object]: any) => {
      report.addRow(`\n\t ${key} ${object.enabled ? 'ENABLED' : 'NOT ENABLED'}`)
      if (object.enabled) {
        Object.entries(object.commands).map(([cmdKey, cmdObj]: any) => {
          report.addRow(`\n\t\t- ${cmdKey} command ${cmdObj.enabled ? 'ENABLED' : 'NOT ENABLED'}`)
        })
      }

    })
    report.log()
  });

}