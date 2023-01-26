import { Router, Request, Response } from "express";
const express = require('express')
const router: Router = express.Router();

const handler = async (req: Request, res: Response) => {
        try {
            res.status(200).send(JSON.stringify(res.locals.CONFIGS));
        } catch (e) {
            console.log("VOTE ERROR",e)
            res.status(400).send(e.message || e);
        }
}

router.post('/',handler)

export default router;