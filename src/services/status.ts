import axios from 'axios'
import notify from './helpers/notify';
import Report from './helpers/class.report'
import { Interval } from './helpers/interval.factory'
import { serviceFiltered } from './helpers/utils'

export default async (service: any, config: any) => {

    Interval.init(service.uuid, service.count_force_notify)
    Interval.inc(service.uuid)
    Interval.status({ info: `${config.title} ${service.title}`, uuid: service.uuid })

    const serviceReport = new Report()
    serviceReport.addRow(`${config.title} ${service.title}`)

    let notifyFlag = false
    let messageType = "Checkin"
    let leadHeight = 0
    let monHeight = 0
    let blockDiffMax = 5
    let disk_alert_threshold = 95
    let reportText = ""
    const monitoringResults = []

    for (let index = 0; index < config.networks.length; index++) {

        const network = config.networks[index];
        if (serviceFiltered("status", network)) continue

        let icon = "✅"

        if (process.env.NODE_ENV == "production") {
            try {
                const resLead = await axios.get(`${network.lcd_leading}/blocks/latest`);
                const resLeadJson = await resLead.data;
                const resMon = await axios.get(`${network.lcd_monitoring}/blocks/latest`);
                const resMonJson = await resMon.data;
                monHeight = resMonJson.block.header.height
                leadHeight = resLeadJson.block.header.height
            } catch (e) {
                console.log(JSON.stringify(e))
                notifyFlag = true
                monHeight = 0
                leadHeight = 0
                if (e.config?.url && e.message) e.message += `: ${e.config?.url}`
                monitoringResults.push({ id: network.chain_id, text: e.message || JSON.stringify(e) })
                messageType = "ERROR"
            }
        }

        const blockDiff = Math.abs(leadHeight - monHeight)
        if (blockDiff > blockDiffMax || leadHeight == 0 || monHeight == 0) {
            notifyFlag = true
            messageType = "BLOCK ALERT!"
            icon = "🚨"
        }

        let diskReport = "N/A"
        if (network.lcd_disk && process.env.NODE_ENV == "production") {
            try {
                const diskData: any = await axios.get(`${network.lcd_disk}`,
                    { timeout: 5000 })

                let diskPercent = diskData?.data?.percent ? parseInt(diskData?.data?.percent) : 0
                if (diskPercent >= disk_alert_threshold) {
                    notifyFlag = true
                    messageType = "DISK ALERT!"
                    icon = "🚨"
                }
                diskReport = `${diskData.data.percent}%`

            } catch (e) {
                console.log(e)
            }
        }

        monitoringResults.push({
            id: network.chain_id,
            text: `${icon} ${network.chain_id.padEnd(18)} ${diskReport} \tHeight: ${monHeight}\tDiff: ${blockDiff}`,
            monHeight,
            leadHeight,
            blockDiff,
            diskReport
        })
    }

    if (Interval.complete(service.uuid, service.run_on_start)) {
        notifyFlag = true
        Interval.reset(service.uuid)
    }

    if (notifyFlag) {
        let text = monitoringResults.map(o => `\n${o.text}`)
        reportText = `\n*Monitoring ${messageType}*\`\`\`${text.join('')}\`\`\``
        await notify({ text: reportText, config, service })
    }
}
