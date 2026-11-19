async function load() {
  setLoading(true);

  let query = supabase()
    .from('students')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (program !== 'সব') {
    query = query.eq('program', program);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    setRows([]);
    alert('শিক্ষার্থী লোড করতে সমস্যা: ' + error.message);
  } else {
    setRows(data || []);
  }

  setLoading(false);
}
