// Supabase returns at most 1,000 rows per request. Tables that grow over a
// school year (attendance, task results, scores...) must be read in pages,
// otherwise the newest rows silently disappear from the screen even though
// they were saved correctly. `orders` gives a stable order across pages.
export const PAGE_SIZE = 1000;

export async function fetchAll(supabase, table, orders = [["id", true]]) {
  const out = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from(table).select("*");
    orders.forEach(([col, asc]) => { q = q.order(col, { ascending: asc }); });
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}
