

do $$
begin
  alter publication supabase_realtime add table public.inquiries;
exception
  when duplicate_object then null;
end $$;

alter table public.inquiries replica identity full;

