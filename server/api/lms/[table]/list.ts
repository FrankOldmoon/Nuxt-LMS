import { db, schema } from "@nuxthub/db";

export default eventHandler(async (event) => {
    const query = getQuery(event)
    const table = getRouterParam(event, 'table')
    const data = await db.query[table].findMany()
    return cResp(data)
});