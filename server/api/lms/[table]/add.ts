import { db, schema } from "@nuxthub/db";

export default eventHandler(async (event) => {
    const body = await readBody(event)
    const tableParam = getRouterParam(event, 'table')

    if (!tableParam || !(tableParam in schema)) {
        return cResp(null, '无效的表名', false)
    }

    const table = tableParam as any

    try {
        // @ts-ignore - 动态表访问
        const result = await db.insert(schema[table]).values(body).returning()
        return cResp(result)
    } catch (error) {
        console.error('插入失败:', error)
        return cResp(null, '插入失败', false)
    }
});
