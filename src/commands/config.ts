import { Router, Request, Response } from "express";
const express = require('express')
const router: Router = express.Router();

const handler = async (req: Request, res: Response) => {
  try {
    let cmd = req.body.text.split(" ")
    let propString = cmd[0]
    let value = cmd[1]
    let nestedProperties = propString.split(".")
    let result = nestedProperties.reduce((acc,prop)=>acc[prop],res.locals.CONFIGS)
    if (value.trim().length > 0) {
      let lastKey = nestedProperties.pop()
      let property = nestedProperties.reduce((acc, prop) => acc[prop], res.locals.CONFIGS)
      property[lastKey] = value
    }
    res.status(200).send(result);

        } catch (e) {
            console.log("VOTE ERROR",e)
            res.status(400).send(e.message || e);
        }
}
router.post('/',handler)

export default router;