import { Router, Request, Response } from "express";
const express = require('express')
const router: Router = express.Router();

import { getCommandConfigBy } from "../../helpers/utils"
import tx_vote from "./tx";

const handler = async (req: Request, res: Response) => {
  try {
    let config: any = null

    if (req?.body?.channel_id) {
      //channel id should defined to increase security, check channel id in request
      const [filename, configData] = getCommandConfigBy(res.locals.CONFIGS, {
        credentialsKey: "channel_id",
        value: req?.body?.channel_id,
        command: "vote"
      })
      config = configData
    } else {
      config = res.locals.CONFIGS[req.query.config]
    }

    if (config) {
      res.status(200).send("Processing request...");
      return await tx_vote({ req, config })
    } else throw new Error("No config. Could not Process request.")

  } catch (e) {
    console.log("VOTE ERROR", e)
    res.status(400).send(e.message || e);
  }
}

router.post('/', handler)

export default router;