import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** Get the list of all medals */
export default eventHandler(async (event) => {
  const medals = await db.select().from(schema.medals)
  return cResp(medals)
})
