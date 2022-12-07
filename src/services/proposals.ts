import { humanRelativeDate, serviceFiltered } from './helpers/utils'
import queryOnChainProposals, { humanReadibleProposalStatus, humanReadibleVoteOption } from './helpers/queryOnChainProposals'
import { instantiator } from './database/instantiator'
import notify from './helpers/notify'
import Report from './helpers/class.report'
import { Interval } from './helpers/interval.factory'
import { ProposalStatus } from 'cosmjs-types/cosmos/gov/v1beta1/gov'

//keep track of which proposals have received notification
const proposalNotifications = []
const dbInstance = instantiator.init("hasura")

export default async (service: any, config: any) => {

	const uuid_regular = service.uuid
	const uuid_active: any = service.uuid + "-active"
	Interval.init(uuid_regular, service.count_force_notify)
	Interval.init(uuid_active, service.count_active_notify)
	Interval.inc(uuid_regular)
	Interval.inc(uuid_active)
    Interval.status({ info: `${config.title} ${service.title}`, uuid: uuid_regular })
    Interval.status({ info: `${config.title} ${service.title}`, uuid: uuid_active })

	const report = new Report()
	report.addRow(`*${config.title} ${service.title}*`)

	let notifyFlag = false
	let forceNotify = false


	if (process.env.NODE_ENV == "production") {

		//get proposals open for voting from database 
		const openProposalsInDatabase = []
		try {
			let res = await dbInstance.exec("getActiveProposals", { timestamp: new Date().toISOString() })
			openProposalsInDatabase.push(...res?.data?.proposals)
			console.log("\n========= openProposalsInDatabase ",
				JSON.stringify(openProposalsInDatabase))
		} catch (e) {
			console.log(e)
		}

		//get proposals open for voting on chain
		const openProposalsOnChain = []
		for (let index = 0; index < config.networks.length; index++) {
			const network = config.networks[index];
			if (serviceFiltered("governance", network)) continue
			let proposalsArray: any[] = await queryOnChainProposals({
				network,
				status: ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD
			})
			if (proposalsArray.length > 0) openProposalsOnChain.push(...proposalsArray)
			else {
				report.addRow(`\`====== ${network.name} ======\``)
				report.addRow(`No active proposals found.`)
			}
		}

		console.log("\n========= openProposalsOnChain.length ", openProposalsOnChain.length)
		if (openProposalsOnChain.length > 0) {

			let curChainId = ""
			let curNetworkConfig: any = {}
			for (let index = 0; index < openProposalsOnChain.length; index++) {

				const chainProposal = openProposalsOnChain[index];

				//find proposal in db results
				const dbProposal = openProposalsInDatabase.find((item: any) => item.proposal_id == chainProposal.proposal_id && item.chain_id == chainProposal.chain_id)

				//if not found save proposal to db
				if (!dbProposal) {
					console.log("INSERTING PROP")
					let res = await dbInstance.exec("insertProposal", { variables: chainProposal } )
					console.log(res)
				}

				//add network heading
				if (chainProposal.chain_id !== curChainId) {
					curChainId = chainProposal.chain_id
					curNetworkConfig = config.networks.find((item: any) => item.chain_id == curChainId)
					report.addRow(`\`====== ${curNetworkConfig.name || curChainId} ======\``)
				}
				let uniqueProposalId = `${curNetworkConfig.name}_${chainProposal.id}`

				//if has not been voted on yet, force notify
				let voteIcon = '✅'
				if (parseInt(chainProposal.option) === 0) {
					if (proposalNotifications.indexOf(uniqueProposalId) === -1) {
						forceNotify = true //force notify if we've never seen this proposal
					}
					notifyFlag = true
					voteIcon = '🚨'
					proposalNotifications.push(uniqueProposalId)
				}

				//build report
				report.addRow(`${voteIcon} *Prop ${chainProposal.proposal_id}*`)
				report.addRow(`${curNetworkConfig.explorer}/${curNetworkConfig.name}/proposals/${chainProposal.proposal_id}`)
				report.backticks().addRow(`Type: ${chainProposal.type}`)
				report.addRow(`Vote: *${humanReadibleVoteOption(chainProposal.option).toUpperCase()}*`)
				report.addRow(`Status: ${humanReadibleProposalStatus(chainProposal.status)}`)
				report.addRow(`Ends: ${humanRelativeDate(chainProposal.voting_end_time)}`).backticks()
			}
		}
	} else {
		//set whatever condition for testing
		notifyFlag = true
	}

	let confirmNotify = false

	//always run at this interval for regular proposal checkins
	if (Interval.complete(uuid_regular, service.run_on_start)) {
		confirmNotify = true
		Interval.reset(uuid_regular)
		Interval.reset(uuid_active)
		proposalNotifications.length = 0 //good to flush at regular notification interval
	}

	//reduce rate of notifications when active proposal is present and has not been voted on
	if (Interval.complete(uuid_active, false) && notifyFlag === true) {
		confirmNotify = true
		Interval.reset(uuid_active)
	}

	console.log("\n\tproposalNotifications", proposalNotifications, "forceNotify", forceNotify)
	if (confirmNotify || forceNotify) {
		await notify({ text: report.print(), config, service })
	}

}