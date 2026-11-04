-- 🪜 Il conto RTW in Bilancio, per ogni utente (Mattia, 04/11/2026): solo il
-- proprio. `conto_rtw` resta chiusa perché accetta un utente qualunque.

create or replace function public.mio_conto_rtw()
returns numeric language sql stable security definer set search_path = public as $$
  select public.conto_rtw(public.mio_user_id());
$$;
revoke all on function public.mio_conto_rtw() from public, anon;
grant execute on function public.mio_conto_rtw() to authenticated;
