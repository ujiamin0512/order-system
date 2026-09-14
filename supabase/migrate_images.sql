-- Adds product pictures: an image_url column and a public "product-images" storage bucket
-- that only admins can write to. Run once in the Supabase SQL editor.

alter table public.order_products add column if not exists image_url text;

-- If this insert fails on your project, create the bucket in the dashboard instead:
-- Storage -> New bucket -> name "product-images", Public bucket ON. Then run the policies below.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product-images: public read" on storage.objects;
create policy "product-images: public read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product-images: admin insert" on storage.objects;
create policy "product-images: admin insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: admin update" on storage.objects;
create policy "product-images: admin update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: admin delete" on storage.objects;
create policy "product-images: admin delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
