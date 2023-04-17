export default class Report {
  private rows: any = [];
  private cols: any = "";
  private colWidths: number[] = [];
  private colIndex: number = 0;
  constructor() { }

  private div: string = `\n\n============================`
  private break: string = `\n----------------------------`

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
  public appendRow(data: string): Report {
    this.rows[this.rows.length - 1] += data
    return this
  }
  public addCol(data: any, align: string = "left", pad?: number): Report {
    data = data.toString()
    pad = this.colWidths[this.colIndex] !== undefined ? this.colWidths[this.colIndex] : pad != undefined ? pad : 0
    this.cols += align == "left" ? data.padEnd(pad) : data.padStart(pad)
    this.colIndex++
    return this
  }
  public startCol(colWidths: number[]): Report {
    this.colWidths = colWidths
    this.colIndex = 0
    return this
  }
  public endCol(): string {
    let res = this.cols
    this.cols = ""
    this.colIndex = 0
    return res
  }
  public addHeader(data: string): Report {
    this.rows.unshift(data)
    return this
  }
  public backticks(): Report {
    this.rows.push("```")
    return this
  }
  public print(): string {
    let res = this.rows.join(`\n`)
    this.rows.length = 0
    return res
  }
  public log(): void {
    console.log(this.print())
  }
}