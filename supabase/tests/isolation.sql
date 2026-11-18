-- Execute only against a disposable Supabase test database; all changes roll back.
begin;
insert into auth.users (id, aud, role, email, encrypted_password) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','fixture-a@example.invalid',''),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','fixture-b@example.invalid','');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
insert into public.user_snapshots(user_id,data) values ('11111111-1111-4111-8111-111111111111','{"fixture":"a"}');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ begin
  if exists(select 1 from public.user_snapshots where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'cross-user read allowed'; end if;
  update public.user_snapshots set data='{"fixture":"changed"}' where user_id='11111111-1111-4111-8111-111111111111';
  if found then raise exception 'cross-user update allowed'; end if;
  delete from public.user_snapshots where user_id='11111111-1111-4111-8111-111111111111';
  if found then raise exception 'cross-user delete allowed'; end if;
  begin
    insert into public.user_snapshots(user_id,data) values ('11111111-1111-4111-8111-111111111111','{}');
    raise exception 'cross-user insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.user_snapshots(user_id,data) values ('22222222-2222-4222-8222-222222222222','{"fixture":"b"}');
do $$ begin if (select count(*) from public.user_snapshots) <> 1 then raise exception 'own row not visible'; end if; end $$;
do $$ begin
  begin
    update public.user_snapshots set user_id='11111111-1111-4111-8111-111111111111' where user_id='22222222-2222-4222-8222-222222222222';
    raise exception 'owner reassignment allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
