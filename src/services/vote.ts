import { EncodeObject } from "@cosmjs/proto-signing"
import { calculateFee, StdFee } from "@cosmjs/stargate"
import { VoteOption } from "cosmjs-types/cosmos/gov/v1beta1/gov"
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx"
import { instantiator } from "./database/instantiator"
import Report from "./helpers/class.report"
import notify from "./helpers/notify"
import { humanReadibleVoteOption, humanVoteOptionToNumber } from "./helpers/queryOnChainProposals"
import { extractPrefix, getSigningClient, granterStdFee } from "./helpers/utils"

const dbInstance = instantiator.init("hasura")
const testVoteTx = true

export default async ({ req, config }) => {

	console.log("\n=========\nVOTE QUERY:", req.query)
	console.log("VOTE QUERY BODY TEXT:", req.body.text)

	const command = config?.commands?.vote
	const report = new Report()

	let authed = false
	if (command.active !== true) {
		report.addRow("Service not active.")
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

  try {
    ////////////////////////////////////////////////////
    //parse command
		let commandParts = req.body["text"].split("|")
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
    //get signer
		const { signingClient, senderAddress } = await getSigningClient({
			mnemonic: config.grantee_mnemonics[command.use_mnemonic],
			rpc: network.rpc,
			gasPrices: `${network.gas_prices}${network.denom}`,
			prefix: extractPrefix(network.granter)
		})

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
		const MsgExec:EncodeObject = {
			typeUrl: "/cosmos.authz.v1beta1.MsgExec",
			value: {
				grantee: senderAddress,
        msgs: [txMsgVote],
			},
		};

		try {
      ////////////////////////////////////////////////////
      //sign and broadcast tx
			let res_tx: any = ""
			if (process.env.NODE_ENV === "production" || testVoteTx) {
				//broadcast vote
				res_tx = await signingClient.signAndBroadcast(senderAddress, [MsgExec], granterStdFee(network));
				console.log(`\n\n\n=========== signAndBroadcast \n\n\n`, res_tx)
			}

      if (res_tx?.transactionHash?.length) {
        ////////////////////////////////////////////////////
				//if successful tx, update vote in database
				let res = await dbInstance.exec("updateProposal",
					{
						variables: {
							chain_id: network.chain_id,
							proposal_id,
							option: optionNumber,
							notes,
						},
						whereObject: {
							chain_id: "_eq",
							proposal_id: "_eq",
						},
						setArray: ["option", "notes"]
          })
        

        ////////////////////////////////////////////////////
				//prep report
				report.addRow(`??? *Completed Vote on \`${network.name}\` Prop ${proposal_id}*`)
				report.backticks().addRow(`Vote: *${humanReadibleVoteOption(optionNumber).toUpperCase()}*`)
				report.addRow(`TX: ${network.explorer}/${network.name}/txs/${res_tx.transactionHash}`)
				report.addRow(`Note: ${notes}`)
				report.backticks()


			} else {
				report.addRow(`???? *Error Executing Vote on Prop*: ${chain} ${proposal_id}`)
			}

		} catch (e) {
			console.log(e)
			report.addRow(`???? *Error Signing & Broadcasting Vote*: ${chain} ${proposal_id}: ${e.message}`)
		}

	} catch (e) {
		console.log(e)
		report.addRow(`???? *Error Forumlating Vote*: ${req.body["text"]}`)
	}

	await notify({
		text: report.print(), config, service: command,
		response_url: req.body.response_url
	})

	return true
}
