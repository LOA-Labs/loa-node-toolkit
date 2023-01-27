//hasura db service
import axios from "axios"

const headers: any = {
  "Content-Type": "application/json",
  "X-Hasura-Admin-Secret": process.env.HASURA_ADMIN_SECRET
}

//define graphql table schema
const props = [
  { name: "uuid", type: "uuid" },
  { name: "chain_id", type: "String" },
  { name: "proposal_id", type: "Int" },
  { name: "type", type: "String" },
  { name: "notes", type: "String" },
  { name: "option", type: "Int" },
  { name: "status", type: "Int" },
  { name: "voting_end_time", type: "timestamptz" }
]

//@todo needs interface
export const dbMethods = {

  exec: async (cmd, payload) => {
    return await dbMethods[cmd](payload)
  },
  dbExec: async (body) => {
    console.log("process.env.HASURA_ENDPOINT", process.env.HASURA_ENDPOINT)
    const gqlResponse = await axios.post(process.env.HASURA_ENDPOINT, body, { headers })
    return gqlResponse.data
  },
  getPropsList: (props) => {
    return props.map((item: any) => item.name).join('\n')
  },
  getPropsObject: (props, variables, filterAr = []) => {
    return dbMethods.filterProps(props, variables, filterAr).map((item: any) =>
      `${item.name}: \$${item.name}`).join(',\n')
  },
  getTypeValues: (props, variables, filterAr = []) => {
    return dbMethods.filterProps(props, variables, filterAr).map((item: any) =>
      `\$${item.name}: ${item.type} = "${variables[item.name]}"`).join(',\n')
  },
  filterProps: (props, variables, filterAr) => {
    return props.filter((item: any) => !filterAr.includes(item.name) && variables[item.name] !== undefined)
  },
  getWhereQuery: (whereObject) => {
    let whereValuePairs = Object.keys(whereObject)
      .map(key => `${key}:{${whereObject[key]}: \$${key}}`)
    return `where: {${whereValuePairs.join(',')}}`
  },
  getSetQuery: (setArray) => {
    let setKeyValuePairs = setArray.map(name => `${name}:\$${name}`)
    return `_set: {${setKeyValuePairs.join(',')}}`
  },

  updateProposal: async ({ variables, whereObject, setArray }) => {

    const propsList = dbMethods.getPropsList(props)
    const propsTypeValues = dbMethods.getTypeValues(props, variables, ['uuid'])
    const whereQuery = dbMethods.getWhereQuery(whereObject)
    const setQuery = dbMethods.getSetQuery(setArray)

    let body = JSON.stringify({
      query: `
			mutation updateProposal(${propsTypeValues}) {
				update_proposals(${whereQuery}, ${setQuery}) {
					returning {
						${propsList}
					}
				}
			}
		`
    })

    let res = await dbMethods.dbExec(body)
    console.log(res)
    return res

  },

  getProposal: async ({ variables, whereObject, setArray }: any) => {
    console.log(variables, whereObject)
    const propsList = dbMethods.getPropsList(props)
    const propsTypeValues = dbMethods.getTypeValues(props, variables, ['uuid'])
    const whereQuery = dbMethods.getWhereQuery(whereObject)

    let body = JSON.stringify({
      query: `
			query getProposal(${propsTypeValues}) {
        proposals(${whereQuery}) {
          ${propsList}
        }
			}
			`
    })
    // console.log(body)
    let res = await dbMethods.dbExec(body)
    return res
  },

  getActiveProposals: async ({ timestamp }) => {

    const propsList = dbMethods.getPropsList(props)
    let body = JSON.stringify({
      query: `
			query getActiveProposals($_gte: timestamptz = "${timestamp}") {
			proposals(where: {voting_end_time: {_gte: $_gte}}) {
				${propsList}
			}
			}
			`
    })
    let res = await dbMethods.dbExec(body)
    return res
  },

  insertProposal: async ({ variables }) => {

    const propsList = dbMethods.getPropsList(props)
    const propsObject = dbMethods.getPropsObject(props, variables, ['uuid'])
    const propsTypeValues = dbMethods.getTypeValues(props, variables, ['uuid'])
    let body = JSON.stringify({
      query: `
			mutation insertProposal(${propsTypeValues}) {
				insert_proposals(objects: {${propsObject}}) {
					returning {
						${propsList}
					}
				}
			}
		`
    })

    let res = await dbMethods.dbExec(body)
    return res

  }
}
