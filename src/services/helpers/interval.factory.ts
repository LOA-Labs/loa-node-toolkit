const counts = []
export const Interval = {
	init(uuid, period: number = 1) {
		if (counts[uuid] == undefined) {
			counts[uuid] = { period, count: 0 }
		}
	},
	inc(uuid) {
		counts[uuid].count++
	},
	reset(uuid) {
		counts[uuid].count = 0
	},
	count(uuid) {
		return counts[uuid].count
	},
	status({ info, uuid }) {
		const now = new Date().toISOString()
		console.log(`\n===============\n\t${info}\n\t${uuid} 
		\n\tTime: ${now}
		\n\tInterval ${counts[uuid].count} / ${counts[uuid].period}`)
	},
	complete(uuid, run_on_start) {
		if (run_on_start === true && counts[uuid].ran_on_start === undefined) {
			return counts[uuid].ran_on_start = true
		}
		return counts[uuid].count >= counts[uuid].period
	}
}