-- Crear tabla 'consultas' para guardar el historial de viajes
create table if not exists public.consultas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  destino text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  presupuesto_usuario numeric not null,
  num_personas integer not null,
  tipo_viaje text not null,
  resultados jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.consultas enable row level security;

-- Políticas de Seguridad (RLS)

-- 1. Permitir a los usuarios insertar sus propias búsquedas
create policy "Permitir inserción a usuarios autenticados" 
on public.consultas 
for insert 
to authenticated 
with check (auth.uid() = user_id);

-- 2. Permitir a los usuarios ver únicamente sus propios viajes guardados
create policy "Permitir lectura de propios registros" 
on public.consultas 
for select 
to authenticated 
using (auth.uid() = user_id);
