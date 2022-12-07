//simple instatiator to allow for multiple database adaptors

import { dbMethods as hasura } from './services/hasura'

const services = {
	hasura,
}

export const instantiator = {
	init(service) {
		return services[service] || null
	}
}