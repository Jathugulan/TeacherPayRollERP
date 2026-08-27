/**
 * Safely extracts arrays from standardized backend API responses
 * Handles { success: true, data: { records: [...], ... } }, { data: [...] }, etc.
 */
export const extractArray = (res, ...fallbackKeys) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;

  if (res.data && typeof res.data === 'object') {
    if (Array.isArray(res.data.records)) return res.data.records;
    if (Array.isArray(res.data.teachers)) return res.data.teachers;
    if (Array.isArray(res.data.leaves)) return res.data.leaves;
    if (Array.isArray(res.data.salaries)) return res.data.salaries;
    if (Array.isArray(res.data.attendance)) return res.data.attendance;
  }

  for (const key of fallbackKeys) {
    if (Array.isArray(res[key])) return res[key];
    if (res.data && Array.isArray(res.data[key])) return res.data[key];
  }

  return [];
};
