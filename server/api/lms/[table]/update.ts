import { db, schema } from "@nuxthub/db";
import { eq } from "drizzle-orm";

export default eventHandler(async (event) => {
    const body = await readBody(event)
    const tableParam = getRouterParam(event, 'table')

    if (!tableParam || !(tableParam in schema)) {
        return cResp(null, '无效的表名', false)
    }

    const table = tableParam as any
    const { id, ...setData } = body

    try {
        // @ts-ignore - 动态表访问
        const result = await db.update(schema[table])
            .set(setData)
            // @ts-ignore - 动态表访问
            .where(eq(schema[table].id, Number(id)))
        return cResp(result)
    } catch (error) {
        console.error('更新失败:', error)
        return cResp(null, '更新失败', false)
    }
});
