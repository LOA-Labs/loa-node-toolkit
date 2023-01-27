import axios from "axios";
import { notify } from "../helpers/notify";
import Report from "../helpers/class.report";
import { Interval } from "../helpers/interval.factory";
import { serviceFiltered } from "../helpers/utils";
import { LntConfig, NetworkConfig, Service } from "../helpers/global.types";

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
  let resultsArray = [];

  for (let index = 0; index < config.networks.length; index++) {

    const network: NetworkConfig = config.networks[index];
    if (serviceFiltered("status", network) || network?.enabled === false) continue;

    ////////////////////////////////////////////////////
    //reset defaults for individual networks
    let icon = "✅";
    let unix_time_now = 0;
    let unix_time_block = 0;
    let latest_block_time = 0;
    let latest_block_height = 0;
    let catching_up = true;

    if (process.env.NODE_ENV == "production" || localStatusTesting) {
      try {
        ////////////////////////////////////////////////////
        //query rpc for status
        const { data: rpc_status }: any = await axios.get(`${network.rpc}/status`);
        // console.log(`${network.name} rpc_status.result.sync_info`, rpc_status.result.sync_info);
        latest_block_height = rpc_status.result.sync_info.latest_block_height;
        catching_up = rpc_status.result.sync_info.catching_up;
        latest_block_time = rpc_status.result.sync_info.latest_block_time;
        unix_time_now = new Date().getTime() / 1000;
        unix_time_block = new Date(latest_block_time).getTime() / 1000;
        // console.log(unix_time_now,unix_time_block)
      } catch (e) {
        console.log(e)
        if (e.config?.url && e.message) e.message += `: ${e.config?.url}`;
        resultsArray.push({
          id: network.chain_id,
          text: e.message || JSON.stringify(e),
        });
        notifyFlag = true;
        messageType = "RPC ERROR";
        icon = "🚨";
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
      icon = "🚨";
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
          icon = "🚨";
        }
        diskReport = `${diskData.data.percent}%`.padStart(3);
      } catch (e) {
        console.log(e);
      }
    }

    //push to results array for reporting
    resultsArray.push({
      id: network.chain_id,
      text: `${icon} ${network.chain_id.padEnd(
        18
      )} ${diskReport} \tHeight: ${latest_block_height.toString().padEnd(9)}\tET: ${latest_block_time_dif_seconds.toFixed(1)}s`.padStart(6),
    });
  }

  if (Interval.complete(service.uuid, service.run_on_start)) {
    notifyFlag = true;
    Interval.reset(service.uuid);
  }

  const report = new Report();
  report.addRow(`\n*Monitoring ${messageType}*`).backticks();
  resultsArray.map((o) => report.addRow(o.text));
  let text = report.backticks().print();

  if (notifyFlag) {
    await notify({ text, config, service });
  } else console.log(text);

  return true
};
