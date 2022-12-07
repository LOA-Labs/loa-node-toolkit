export default class Report {
	private rows: any = [];
	constructor() {}
	public addRow(data: string) {
		this.rows.push(data)
		return this
	}
	public backticks() {
		this.rows.push("```")
		return this
	}
	public print() {
		return this.rows.join(`\n`)
	}
}