import axios from "axios";
import { notify } from "../helpers/notify";
import Report from "../helpers/class.report";
import { Interval } from "../helpers/interval.factory";
import { serviceFiltered, icons } from "../helpers/utils";
import { LntConfig, NetworkConfig, Service } from "../helpers/global.types";
import { socketFactory, WebsocketClientObject } from "../helpers/socket.factory";
import { delegationsEventHandler, getReqMsgDelegate, getReqMsgUnDelegate, statusRequest } from "../helpers/rpcQueries";

const localStatusTesting = true;

export default async (service: Service, config: LntConfig): Promise<boolean> => {

  ////////////////////////////////////////////////////
  //start interval service
  Interval.init(service.uuid, service.force_notify_count);
  Interval.inc(service.uuid);
  Interval.status({
    info: `${config.title} ${service.title}`,
    uuid: service.uuid,
  });

  ////////////////////////////////////////////////////
  //set report defaults
  let notifyFlag = false;
  let messageType = "Checkin";
  let latest_block_time_maxdif_seconds = 60;
  let disk_alert_threshold = 96;

  const report = new Report();

  const colWidths = [5, 20, 5, 10, 10, 15]
  report.backticks().addRow(
    report.startCol(colWidths)
      .addCol("///", "left")
      .addCol("Network", "left")
      .addCol("Disk", "right")
      .addCol("Height", "right")
      .addCol("Elapsed", "right")
      .addCol("Voting Power", "right")
      .endCol()
  )

  for (let index = 0; index < config.networks.length; index++) {

    const network: NetworkConfig = config.networks[index];
    if (serviceFiltered("status", network) || network?.enabled === false) continue;

    ////////////////////////////////////////////////////
    //reset defaults for individual networks
    let icon = icons.good;
    let unix_time_now = 0;
    let unix_time_block = 0;
    let latest_block_time = 0;
    let latest_block_height = 0;
    let catching_up = true;
    let voting_power = 0;

    if (process.env.NODE_ENV == "production" || localStatusTesting) {
      try {

        const WS: WebsocketClientObject = socketFactory(network.rpc)
        ////////////////////////////////////////////////////
        //query rpc for status
        let rpc_status = await WS.client.execute(statusRequest)

        ////////////////////////////////////////////////////
        //add subscriptions
        WS.addSubscription({ key: "_getReqMsgDelegate", config, network, service, notify, requestFunction: getReqMsgDelegate, eventHandler: delegationsEventHandler })
        WS.addSubscription({ key: "_getReqMsgUnDelegate", config, network, service, notify, requestFunction: getReqMsgUnDelegate, eventHandler: delegationsEventHandler })

        voting_power = rpc_status.result.validator_info.voting_power;
        latest_block_height = rpc_status.result.sync_info.latest_block_height;
        catching_up = rpc_status.result.sync_info.catching_up;
        latest_block_time = rpc_status.result.sync_info.latest_block_time;
        unix_time_now = new Date().getTime() / 1000;
        unix_time_block = new Date(latest_block_time).getTime() / 1000;

      } catch (e) {
        if (e.config?.url && e.message) e.message += `: ${e.config?.url}`; notifyFlag = true;
        messageType = "RPC ERROR";
        icon = icons.bad;
        report.addRow(e.message)
      }
    }

    ////////////////////////////////////////////////////
    //check elapsed time since last block
    const latest_block_time_dif_seconds = Math.abs(unix_time_block - unix_time_now)
    if (
      catching_up == true ||
      latest_block_time_dif_seconds > latest_block_time_maxdif_seconds ||
      latest_block_height == 0
    ) {
      notifyFlag = true;
      messageType = "BLOCK ALERT!";
      icon = icons.bad;
    }

    ////////////////////////////////////////////////////
    //check disk usage
    let diskReport = "N/A";
    if (network.disk_check_endpoint && process.env.NODE_ENV == "production" || localStatusTesting) {
      try {
        const diskData: any = await axios.get(`${network.disk_check_endpoint}`, {
          timeout: 5000,
        });

        let diskPercent = diskData?.data?.percent
          ? parseInt(diskData?.data?.percent)
          : 0;
        if (diskPercent >= disk_alert_threshold) {
          notifyFlag = true;
          messageType = "DISK ALERT!";
          icon = icons.bad;
        }
        diskReport = `${diskData.data.percent}%`;
      } catch (e) {
        console.log(e);
      }
    }
    ////////////////////////////////////////////////////
    //add report row with data results
    report.addRow(
      report.startCol(colWidths)
        .addCol(icon, "left")
        .addCol(network.chain_id, "left")
        .addCol(diskReport, "right")
        .addCol(latest_block_height, "right")
        .addCol(`${latest_block_time_dif_seconds.toFixed(1)}s`, "right")
        .addCol(voting_power, "right")
        .endCol()
    )

  }

  if (Interval.complete(service.uuid, service.run_on_start)) {
    notifyFlag = true;
    Interval.reset(service.uuid);
  }


  report.addHeader(`\n*Monitoring ${messageType}*`)

  let text = report.backticks().print();

  if (notifyFlag) {
    await notify({ text, config, service });
  } else console.log(text);

  return true
};
