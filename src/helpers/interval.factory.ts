const counts = []
export const Interval = {
  init(uuid: string, period: number = 1): void {
    if (counts[uuid] == undefined) {
      counts[uuid] = { period, count: 0 }
    }
  },
  inc(uuid: string): void {
    counts[uuid].count++
  },
  reset(uuid: string): void {
    counts[uuid].count = 0
  },
  count(uuid: string): number {
    return counts[uuid].count
  },
  status({ info, uuid }: { info: string, uuid: string }): void {
    const now = new Date().toISOString()
    console.log(`\n===============\n\t${info}\n\t${uuid} 
		\n\tTime: ${now}
		\n\tInterval ${counts[uuid].count} / ${counts[uuid].period}`)
  },
  complete(uuid: string, run_on_start: boolean): boolean {
    if (run_on_start === true && counts[uuid].ran_on_start === undefined) {
      return counts[uuid].ran_on_start = true
    }
    console.log(`\ncounts[${uuid}].count ${counts[uuid].count} >= counts[${uuid}].period ${counts[uuid].period}: ${counts[uuid].count >= counts[uuid].period}`)
    return counts[uuid].count >= counts[uuid].period
  }
}