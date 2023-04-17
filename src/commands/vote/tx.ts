import { EncodeObject } from "@cosmjs/proto-signing"
import { VoteOption } from "cosmjs-types/cosmos/gov/v1beta1/gov"
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx"
import Report from "../../helpers/class.report"
import { notify } from "../../helpers/notify"
import { humanReadibleVoteOption, humanVoteOptionToNumber } from "../../helpers/queryOnChainProposals"
import { extractBech32Prefix, getSignerObject, execSignAndBroadcast, SignerObject, icons } from "../../helpers/utils"
import { LntConfig } from "../../helpers/global.types"
import Request from "express"
import { instantiator } from "../../services/database/instantiator"

//optional storing of votes in db
const dbInstance = instantiator.init("hasura") || null

const testVoteTx = true

export default async ({ req, config }: { req: Request, config: LntConfig }): Promise<boolean> => {

  console.log("\nVOTE QUERY:", req.query)
  console.log("VOTE QUERY BODY TEXT:", req.body.text)
  const command = config?.commands?.vote
  const report = new Report()

  //crude auth
  try {
    let authed = false
    if (command.enabled !== true) {
      report.addRow("Service not enabled.")
    } else if (typeof command.credentials === "object" && command.credentials !== null) {
      ////////////////////////////////////////////////////
      //authenticate source of command 
      let credKeys = Object.keys(command.credentials)
      for (let index = 0; index < credKeys.length; index++) {
        let cred_value = command.credentials[credKeys[index]];
        cred_value = Array.isArray(cred_value) ? cred_value : [cred_value]
        if (cred_value && cred_value.indexOf(req.body[credKeys[index]]) !== -1) {
          authed = true
        }
      }
    }

    ////////////////////////////////////////////////////
    //exit with error if not authorized
    if (!authed) {
      report.addRow("Unauthorized vote.")
      await notify({
        text: report.print(),
        config,
        service: command,
        response_url: req.body.response_url
      })
      return false
    }
  } catch (e) {
    console.log("Caught Error:", e)
  }

  try {
    ////////////////////////////////////////////////////
    //parse command
    let commandParts = req.body.text.split("|")
    let [chain, proposal_id, option] = commandParts[0].replace(/\s+/, " ").split(" ")
    let notes: string = commandParts?.[1] ? commandParts[1].trim() : ""
    proposal_id = parseInt(proposal_id)
    let optionNumber: VoteOption = humanVoteOptionToNumber(option)

    ////////////////////////////////////////////////////
    //determine which network config
    let network = config.networks.find(item => {
      return item.name.toLowerCase() == chain.toLowerCase()
    })

    ////////////////////////////////////////////////////
    //get signer address
    const signerObject: SignerObject = await getSignerObject({ config, network, service: command })

    ////////////////////////////////////////////////////
    //create msg vote
    const txMsgVote = {
      typeUrl: "/cosmos.gov.v1beta1.MsgVote",
      value: MsgVote.encode(
        MsgVote.fromPartial({
          proposalId: proposal_id,
          voter: network.granter,
          option: optionNumber
        })).finish()
    };

    ////////////////////////////////////////////////////
    //create msg exec
    const MsgExec: EncodeObject = {
      typeUrl: "/cosmos.authz.v1beta1.MsgExec",
      value: {
        grantee: signerObject.senderAddress,
        msgs: [txMsgVote],
      },
    };

    try {
      ////////////////////////////////////////////////////
      //sign and broadcast tx
      let res_tx: any = ""
      if (process.env.NODE_ENV === "production" || testVoteTx) {
        //broadcast vote
        res_tx = await execSignAndBroadcast({ signerObject, msg: [MsgExec], network });
        console.log(`\n\n\n=========== signAndBroadcast \n\n\n`, res_tx, `res_tx?.transactionHash?.length ${res_tx?.res?.transactionHash?.length}`)
      } else {
        console.log("No broadcast", [MsgExec])
      }

      res_tx.res
      ////////////////////////////////////////////////////
      //successful tx, notify
      if (res_tx?.res?.transactionHash?.length) {

        console.log("Notify...")
        ////////////////////////////////////////////////////
        //prep report
        if (res_tx.res.code !== 0) {
          //was not successful
          report.addRow(`${icons.bad} *Vote Failed on \`${network.name}\` Prop ${proposal_id}*`)
          report.addRow(`TX: ${config.explorer}/${network.name}/txs/${res_tx.res.transactionHash}`)
          report.addRow(`Code: ${res_tx.res.code}\n${res_tx.res.rawLog}`)

        } else {
          report.addRow(`${icons.good} *Completed Vote on \`${network.name}\` Prop ${proposal_id}*`)
          report.backticks().addRow(`Vote: *${humanReadibleVoteOption(optionNumber).toUpperCase()}*`)
          report.addRow(`TX: ${config.explorer}/${network.name}/txs/${res_tx.res.transactionHash}`)
          report.addRow(`Note: ${notes}`)
          report.backticks()
        }

        await notify({
          text: report.print(), config, service: command,
          response_url: req.body.response_url
        })

        ////////////////////////////////////////////////////
        //if storing in database
        if (dbInstance) {
          await storeVoteInDB({
            chain_id: network.chain_id,
            proposal_id,
            option: optionNumber,
            notes,
          })
        }

      } else {
        report.addRow(`🚨 *Error Executing Vote on Prop*: ${chain} ${proposal_id}`)
        await notify({
          text: report.print(), config, service: command,
          response_url: req.body.response_url
        })
      }

    } catch (e) {
      console.log("Caught Error:", e)
      report.addRow(`🚨 *Error Signing & Broadcasting Vote*: ${chain} ${proposal_id}: ${e.message}`)
      await notify({
        text: report.print(), config, service: command,
        response_url: req.body.response_url
      })
    }

  } catch (e) {
    console.log("Caught Error:", e)
    report.addRow(`🚨 *Error Forumlating Vote*: ${req.body["text"]}`)
    await notify({
      text: report.print(), config, service: command,
      response_url: req.body.response_url
    })
  }

  return true
}









const storeVoteInDB = async (variables: any): Promise<boolean> => {

  try {
    ////////////////////////////////////////////////////
    //check if already voted
    let res = await dbInstance.exec("getProposal", {
      variables: {
        chain_id: variables.chain_id,
        proposal_id: variables.proposal_id
      },
      whereObject: {
        chain_id: "_eq",
        proposal_id: "_eq",
      },
    });

    //if proposal found, update with new vote info
    if (res.data?.proposals?.length) {
      await dbInstance.exec("updateProposal",
        {
          variables,
          whereObject: {
            chain_id: "_eq",
            proposal_id: "_eq",
          },
          setArray: ["option", "notes"]
        })

    } else {
      //else proposal not found, insert
      await dbInstance.exec("insertProposal", {
        variables
      });
    }

  } catch (e) {
    console.log("Caught Error:", e)
  }

  return true
}