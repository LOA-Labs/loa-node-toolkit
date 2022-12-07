import { GasPrice, SigningStargateClient } from "@cosmjs/stargate"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import axios from 'axios'
import { relativeTime } from "human-date"

export const getSigningClient = async ({ prefix, mnemonic, rpc, gasPrices }) => {

	const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
		return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
			prefix
		})
	}

	const Signer: OfflineDirectSigner = await getSignerFromMnemonic()

	const senderAddress = (await Signer.getAccounts())[0].address

	const signingClient = await SigningStargateClient.connectWithSigner(rpc, Signer,

		{ gasPrice: GasPrice.fromString(`${gasPrices}`) }
	)

	return { signingClient, senderAddress }
}

export const extractPrefix = (addr: string) => {
	return addr.split('1').shift()
}

export const logg = (title: string, body: string) => {
	console.log(JSON.stringify(JSON.parse(body), null, 4).replace(/\\n/g, '\n').replace(/\\t/g, '\t'))
}

export const humanReadibleDateFromISO = (isoDate: string) => {
	let options: any = {
		weekday: 'short', year: 'numeric',
		month: 'short', day: '2-digit',
		hour: "2-digit",
		minute: "2-digit",
		timeZone: 'UTC', timeZoneName: 'short'
	};
	return new Date(isoDate).toLocaleString('en-US', options)
}

export const humanRelativeDate = (dateRepresentation: any) => {
	return relativeTime(dateRepresentation)
}

export const unicodeToChar = (text: string) => {
	return text.replace(/\\u[\dA-F]{4}/gi,
		function (match) {
			return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
		});
}

export const serviceFiltered = (service_name: string, network: any): Boolean => {
	if (Array.isArray(network.filterServices)) {
		return network.filter_services.indexOf(service_name) != -1 ? true : false
	}
	return false
}

export const $fmt = (value: number, pad = 0): string => {
	return value.toLocaleString("en-US", { style: "currency", currency: "USD" }).padStart(pad)
}

export const getPrices = async (price_api: string) => {
	return await axios.get(price_api);
}

export const microToMacro = (value: string | number): number => {
	return Number(value) / 1000000
}

export const signAndBroadcast = async (props: any) => {
	const { network, signingClient, senderAddress, msg } = props
	try {
		let res = await signingClient.signAndBroadcast(senderAddress, msg,
			{
				amount: [{ denom: network.denom, amount: "5000" }],
				gas: "200000",
			});
		return { chain_id: network.chain_id, res }

	} catch (e) {
		console.log(e)
		return { chain_id: network.chain_id, error: e }
	}
}