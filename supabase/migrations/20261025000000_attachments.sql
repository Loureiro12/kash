-- Comprovante anexado a um lançamento (app 1.3.0): a foto fica no Storage (bucket privado
-- `receipts`), numa pasta por pessoa: `<user_id>/<transaction_id>/<arquivo>.jpg`. O lançamento guarda
-- o caminho. Só a própria pessoa lê, grava e apaga (RLS em storage.objects pela 1ª pasta do caminho).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "receipts: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts: dono grava" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts: dono atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- caminho do arquivo no bucket; precisa estar na pasta da própria pessoa
alter table public.transactions
  add column attachment_path text check (attachment_path is null or (char_length(attachment_path) <= 200 and split_part(attachment_path, '/', 1) = user_id::text));
