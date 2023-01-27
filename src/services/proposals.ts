import { humanRelativeDate, serviceFiltered } from "../helpers/utils";
import {
  queryOnChainProposals,
  humanReadibleProposalStatus,
  humanReadibleVoteOption,
  OnChainProposalResult,
} from "../helpers/queryOnChainProposals";
import { notify } from "../helpers/notify";
import Report from "../helpers/class.report";
import { Interval } from "../helpers/interval.factory";
import { ProposalStatus } from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { LntConfig, NetworkConfig, Service } from "../helpers/global.types";

const localTesting = true

////////////////////////////////////////////////////
//keep in memory new proposals that have already triggered notification
const newProposalNotifications = [];

export default async (service: Service, config: LntConfig): Promise<boolean> => {

  try {
    ////////////////////////////////////////////////////
    //start two interval services, one regular, one more frequent
    const uuid_regular: string = service.uuid;
    const uuid_active: string = service.uuid + "-active";
    Interval.init(uuid_regular, service.force_notify_count);
    Interval.init(uuid_active, service.count_active_notify);
    Interval.inc(uuid_regular);
    Interval.inc(uuid_active);
    Interval.status({
      info: `${config.title} ${service.title}`,
      uuid: uuid_regular,
    });
    Interval.status({
      info: `${config.title} ${service.title}`,
      uuid: uuid_active,
    });

    ////////////////////////////////////////////////////
    //init reporting
    const report = new Report();
    report.addRow(`*${config.title} ${service.title}*`);

    let notifyFlag = false;
    let forceNotify = false;

    if (process.env.NODE_ENV == "production" || localTesting) {

      ////////////////////////////////////////////////////
      //get on-chain proposals open for voting for each network
      const openProposalsOnChain = [];
      for (let index = 0; index < config.networks.length; index++) {
        const network: NetworkConfig = config.networks[index];
        if (serviceFiltered("governance", network) || network?.enabled === false) continue;

        let proposalsArray: OnChainProposalResult[] = await queryOnChainProposals({
          network,
          status: ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD,
        });
        if (proposalsArray.length > 0)
          openProposalsOnChain.push(...proposalsArray);
        else {
          report.addRow(`\`====== ${network.name} ======\``);
          report.addRow(`No enabled proposals found.`);
        }
      }

      console.log(
        "\n========= openProposalsOnChain.length ",
        openProposalsOnChain.length
      );

      if (openProposalsOnChain.length > 0) {
        let curChainId = "";
        let curNetworkConfig: any = {};

        ////////////////////////////////////////////////////
        //check each on-chain proposal 
        for (let index = 0; index < openProposalsOnChain.length; index++) {
          const chainProposal = openProposalsOnChain[index];

          ////////////////////////////////////////////////////
          //add network heading for reporting
          if (chainProposal.chain_id !== curChainId) {
            curChainId = chainProposal.chain_id;
            curNetworkConfig = config.networks.find(
              (item: any) => item.chain_id == curChainId
            );
            report.addRow(
              `\`====== ${curNetworkConfig.name || curChainId} ======\``
            );
          }

          let uniqueProposalId = `${curNetworkConfig.name}_${chainProposal.id}`;
          let voteIcon = "✅";
          ////////////////////////////////////////////////////
          //if has not been voted on yet, force notify
          if (parseInt(chainProposal.option) === 0) {
            if (newProposalNotifications.indexOf(uniqueProposalId) === -1) {
              forceNotify = true; //force notify if we've never seen this proposal
            }
            notifyFlag = true;
            voteIcon = "🚨";
            newProposalNotifications.push(uniqueProposalId);
          }

          ////////////////////////////////////////////////////
          //add proposal info to report
          report.addRow(`${voteIcon} *Prop ${chainProposal.proposal_id}*`);
          report.addRow(
            `${config.explorer}/${curNetworkConfig.name}/proposals/${chainProposal.proposal_id}`
          );
          report.backticks().addRow(`Type: ${chainProposal.type}`);
          report.addRow(
            `Vote: *${humanReadibleVoteOption(
              chainProposal.option
            ).toUpperCase()}*`
          );
          report.addRow(
            `Status: ${humanReadibleProposalStatus(chainProposal.status)}`
          );
          report
            .addRow(`Ends: ${humanRelativeDate(chainProposal.voting_end_time)}`)
            .backticks();
        }
      }
    }

    ////////////////////////////////////////////////////
    //regualr notification confirmation false, only triggered at intervals
    let confirmNotify = false;

    ////////////////////////////////////////////////////
    //regular proposal checkin interval
    if (Interval.complete(uuid_regular, service.run_on_start)) {
      confirmNotify = true;
      Interval.reset(uuid_regular);
      Interval.reset(uuid_active);
      newProposalNotifications.length = 0; //flush from memory at regular notification interval
    }

    ////////////////////////////////////////////////////
    //reduce rate of notifications after open proposal has already triggered notification
    if (Interval.complete(uuid_active, false) && notifyFlag === true) {
      confirmNotify = true;
      Interval.reset(uuid_active);
    }

    ////////////////////////////////////////////////////
    //confirmNotify triggered at regular intervals, force notify triggered on new proposals
    if (confirmNotify || forceNotify) {
      await notify({ text: report.print(), config, service });
    }

    return true

  } catch (e) {
    await notify({ text: `Caught Error ${e.message}`, config, service });
    return false
  }
};
