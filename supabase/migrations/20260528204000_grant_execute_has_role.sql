-- Grant execute permission on has_role function to authenticated users so RLS policies can run it
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
