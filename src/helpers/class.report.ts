export default class Report {
  private rows: any = [];
  constructor() { }

  private div: string = `==============================`
  private break: string = ` ----------------------------`

  public header(data: string): Report {
    this.rows.push('')
    this.rows.push(this.div)
    this.rows.push(`# ${data}`)
    return this
  }

  public section(data?: string): Report {
    this.rows.push(this.break)
    this.rows.push(data)
    return this
  }
  public addRow(data: string): Report {
    this.rows.push(data)
    return this
  }
  public backticks(): Report {
    this.rows.push("```")
    return this
  }
  public print(): string {
    return this.rows.join(`\n`)
  }
  public log(): void {
    console.log(this.print())
  }
}