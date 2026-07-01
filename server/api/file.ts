export default eventHandler(async (event) => {
  const query = getQuery(event)
  const file = await blob.get(query.pathname)
  return file;
});