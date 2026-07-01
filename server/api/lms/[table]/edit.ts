import { db, schema } from "@nuxthub/db";

export default eventHandler(async (event) => {
    const query = getQuery(event)
    const table = getRouterParam(event, 'table')
    const id = query.id
    const data = await db.query[table].findFirst({ where: { id } })
    return cResp(data)
});