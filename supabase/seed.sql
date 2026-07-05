-- ============================================================================
-- AutoPipeline CRM — seed data
-- Demo dealership: Metro East Toyota (Quezon City)
-- ALL seed users share the password: demo1234
--
-- Sections: dealers → teams → auth users → profiles → leads →
--           lead_activities → follow_ups → promos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Dealers
-- ----------------------------------------------------------------------------
insert into public.dealers (id, name, brand, city) values
  ('d0000000-0000-0000-0000-000000000001', 'Metro East Toyota', 'Toyota', 'Quezon City');

-- ----------------------------------------------------------------------------
-- 2. Teams
-- ----------------------------------------------------------------------------
insert into public.teams (id, dealer_id, name, monthly_target_units) values
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Team A', 40),
  ('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Team B', 35);

-- ----------------------------------------------------------------------------
-- 3. Auth users (auth.users + auth.identities)
--    Single DO block: the Supabase CLI seeds via batched statements where
--    pg_temp does not survive, so everything stays inside one block.
--    Password for every user: demo1234
-- ----------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('e0000000-0000-0000-0000-000000000001'::uuid, 'principal@demo.ph'),
      ('e0000000-0000-0000-0000-000000000002'::uuid, 'director@demo.ph'),
      ('e0000000-0000-0000-0000-000000000003'::uuid, 'gsm1@demo.ph'),
      ('e0000000-0000-0000-0000-000000000004'::uuid, 'gsm2@demo.ph'),
      ('e0000000-0000-0000-0000-000000000005'::uuid, 'agent1@demo.ph'),
      ('e0000000-0000-0000-0000-000000000006'::uuid, 'agent2@demo.ph'),
      ('e0000000-0000-0000-0000-000000000007'::uuid, 'agent3@demo.ph'),
      ('e0000000-0000-0000-0000-000000000008'::uuid, 'agent4@demo.ph')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current
    ) values (
      '00000000-0000-0000-0000-000000000000',
      u.id,
      'authenticated',
      'authenticated',
      u.email,
      extensions.crypt('demo1234', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '', '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      u.id::text,
      u.id,
      jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Profiles (must come after the auth DO block)
-- ----------------------------------------------------------------------------
insert into public.profiles (id, full_name, role, dealer_id, team_id, phone, monthly_target_units) values
  ('e0000000-0000-0000-0000-000000000001', 'Ramon Villanueva',   'dealer_principal', 'd0000000-0000-0000-0000-000000000001', null,                                   '+63 917 100 0001', null),
  ('e0000000-0000-0000-0000-000000000002', 'Cecilia Ramos',      'sales_director',   'd0000000-0000-0000-0000-000000000001', null,                                   '+63 917 100 0002', null),
  ('e0000000-0000-0000-0000-000000000003', 'Marites Dizon',      'gsm',              'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '+63 917 100 0003', null),
  ('e0000000-0000-0000-0000-000000000004', 'Edgardo Salazar',    'gsm',              'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '+63 917 100 0004', null),
  ('e0000000-0000-0000-0000-000000000005', 'Juan Miguel Santos', 'agent',            'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '+63 917 100 0005', 5),
  ('e0000000-0000-0000-0000-000000000006', 'Ana Liza Reyes',     'agent',            'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '+63 917 100 0006', 5),
  ('e0000000-0000-0000-0000-000000000007', 'Paolo Bautista',     'agent',            'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '+63 917 100 0007', 5),
  ('e0000000-0000-0000-0000-000000000008', 'Kristine Ocampo',    'agent',            'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '+63 917 100 0008', 5);

-- ----------------------------------------------------------------------------
-- 5. Leads (30) — team_id filled by trigger from the agent's profile.
--    Stages span the full v2 pipeline so the dashboards show rich counts.
-- ----------------------------------------------------------------------------

-- agent1 — Juan Miguel Santos (Team A): leads 01–08
insert into public.leads (id, dealer_id, agent_id, customer_name, phone, source, model, variant, stage, probability, est_value, created_at, updated_at) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Roberto dela Cruz',  '+63 918 201 4501', 'facebook_ads', 'Vios',        '1.3 XLE CVT',         'new_lead',              10, 848000.00,  now() - interval '2 days',  now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Marissa Aquino',     '+63 919 305 8812', 'website',      'Raize',       '1.0 Turbo CVT',       'attempting_contact',    20, 1063000.00, now() - interval '1 day',   now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Dennis Garcia',      '+63 918 442 7719', 'walk_in',      'Innova',      '2.8 E Diesel AT',     'contacted',             40, 1611000.00, now() - interval '6 days',  now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Lorna Mendoza',      '+63 919 118 2244', 'referral',     'Wigo',        '1.0 G CVT',           'no_response',           15, 709000.00,  now() - interval '5 days',  now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Arnel Villanueva',   '+63 918 667 3390', 'facebook_ads', 'Fortuner',    '2.4 G Diesel 4x2 AT', 'proposal_sent',         55, 1874000.00, now() - interval '9 days',  now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Cherry Santos',      '+63 919 728 5561', 'website',      'Veloz',       '1.5 V CVT',           'application_submitted', 70, 1250000.00, now() - interval '12 days', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Federico Ramos',     '+63 918 903 1187', 'referral',     'Hilux',       'Conquest 2.8 4x4 AT', 'bank_processing',       80, 1861000.00, now() - interval '18 days', now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Imelda Navarro',     '+63 919 214 6633', 'walk_in',      'Yaris Cross', '1.5 S HEV CVT',       'approved',              90, 1556000.00, now() - interval '25 days', now() - interval '2 days');

-- agent2 — Ana Liza Reyes (Team A): leads 09–15 (lead 09 used by negative RLS test)
insert into public.leads (id, dealer_id, agent_id, customer_name, phone, source, model, variant, stage, probability, est_value, created_at, updated_at) values
  ('f0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Gerardo Bautista',   '+63 918 335 9021', 'facebook_ads', 'Raize',       '1.2 E CVT',           'new_lead',              10, 781000.00,  now() - interval '1 day',   now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Rowena Castillo',    '+63 919 556 7742', 'other',        'Vios',        '1.5 GR-S CVT',        'attempting_contact',    20, 1039000.00, now() - interval '3 days',  now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Nestor Ocampo',      '+63 918 771 2856', 'website',      'Innova',      '2.8 V Diesel AT',     'contacted',             40, 1919000.00, now() - interval '7 days',  now() - interval '5 days'),
  ('f0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Divina Soriano',     '+63 919 883 4410', 'referral',     'Wigo',        '1.0 TRD S CVT',       'proposal_sent',         55, 748000.00,  now() - interval '6 days',  now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Ferdinand Lim',      '+63 918 492 6178', 'walk_in',      'Fortuner',    '2.8 Q Diesel 4x4 AT', 'cash_transaction',      80, 2509000.00, now() - interval '10 days', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Corazon Pascual',    '+63 919 605 3327', 'facebook_ads', 'Veloz',       '1.5 G CVT',           'bank_processing',       80, 1185000.00, now() - interval '20 days', now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Danilo Fernandez',   '+63 918 210 9984', 'referral',     'Vios',        '1.3 XE CVT',          'unit_released',        100, 888000.00,  now() - interval '32 days', now() - interval '1 day');

-- agent3 — Paolo Bautista (Team B): leads 16–23
insert into public.leads (id, dealer_id, agent_id, customer_name, phone, source, model, variant, stage, probability, est_value, created_at, updated_at) values
  ('f0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Evelyn Torres',      '+63 919 447 8823', 'facebook_ads', 'Wigo',        '1.0 E MT',            'new_lead',              10, 709000.00,  now() - interval '1 day',   now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Rodolfo Mercado',    '+63 918 559 1204', 'walk_in',      'Hilux',       '2.4 E Diesel 4x2 MT', 'attempting_contact',    20, 1122000.00, now() - interval '2 days',  now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000018', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Teresita Gonzales',  '+63 919 662 3389', 'website',      'Yaris Cross', '1.5 V CVT',           'no_response',           15, 1204000.00, now() - interval '4 days',  now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Manuel Aquino',      '+63 918 778 4456', 'referral',     'Vios',        '1.3 XLE CVT',         'contacted',             40, 848000.00,  now() - interval '8 days',  now() - interval '5 days'),
  ('f0000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Josefina Ramirez',   '+63 919 884 5512', 'other',        'Raize',       '1.0 Turbo CVT',       'proposal_sent',         55, 1063000.00, now() - interval '7 days',  now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Alfredo dela Cruz',  '+63 918 991 6678', 'facebook_ads', 'Innova',      '2.8 E Diesel AT',     'application_submitted', 70, 1611000.00, now() - interval '11 days', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Beverly Santiago',   '+63 919 103 7789', 'walk_in',      'Veloz',       '1.5 V CVT',           'bank_processing',       80, 1250000.00, now() - interval '14 days', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Rogelio Mendoza',    '+63 918 215 8890', 'referral',     'Fortuner',    '2.4 V Diesel 4x2 AT', 'denied',                 0, 2119000.00, now() - interval '28 days', now() - interval '3 days');

-- agent4 — Kristine Ocampo (Team B): leads 24–30
insert into public.leads (id, dealer_id, agent_id, customer_name, phone, source, model, variant, stage, probability, est_value, created_at, updated_at) values
  ('f0000000-0000-0000-0000-000000000024', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Luzviminda Cruz',    '+63 919 327 9901', 'facebook_ads', 'Vios',        '1.3 J MT',            'new_lead',              10, 848000.00,  now() - interval '1 day',   now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000025', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Wilfredo Padilla',   '+63 918 438 1012', 'website',      'Hilux',       '2.4 G Diesel 4x2 AT', 'attempting_contact',    20, 1436000.00, now() - interval '3 days',  now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000026', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Gloria Villanueva',  '+63 919 549 2123', 'referral',     'Wigo',        '1.0 G CVT',           'contacted',             40, 709000.00,  now() - interval '6 days',  now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000027', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Ernesto Reyes',      '+63 918 650 3234', 'walk_in',      'Yaris Cross', '1.5 G CVT',           'proposal_sent',         55, 1341000.00, now() - interval '9 days',  now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000028', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Melinda Salvador',   '+63 919 761 4345', 'facebook_ads', 'Raize',       '1.2 G CVT',           'application_submitted', 70, 902000.00,  now() - interval '10 days', now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Ricardo Domingo',    '+63 918 872 5456', 'other',        'Innova',      '2.8 V Diesel AT',     'approved',              90, 1919000.00, now() - interval '13 days', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000030', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Susana Garcia',      '+63 919 983 6567', 'website',      'Fortuner',    '2.8 Q Diesel 4x4 AT', 'cancelled_lost',         0, 2509000.00, now() - interval '19 days', now() - interval '4 days');

-- ----------------------------------------------------------------------------
-- 6. Lead activities (manual entries; stage changes are logged by trigger)
-- ----------------------------------------------------------------------------
insert into public.lead_activities (lead_id, dealer_id, actor_id, type, detail, created_at) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'messenger',      'Customer asked about DP promo for Vios via FB Messenger',           now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'call',           'Called re: Innova availability, will visit showroom this weekend',  now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'note',           'Sent Fortuner quotation, waiting for client decision',              now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'note',           'Complete requirements submitted, endorsed to bank',                 now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'note',           'Bank application under evaluation, follow up midweek',              now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'sms',            'Sent quotation for Innova V, customer comparing with Innova E',     now() - interval '5 days'),
  ('f0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'note',           'Cash buyer, processing sales invoice and release papers',           now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'call',           'Follow-up call, scheduled proposal presentation',                   now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'note',           'Bank processing, client submitted additional income docs',          now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000027', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'messenger',      'Asked kung may available na Yaris Cross in Blazing Blue',           now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'note',           'Bank pre-approved, preparing unit for release',                     now() - interval '2 days');

-- ----------------------------------------------------------------------------
-- 7. Follow-ups (overdue, missed, due today, upcoming, done)
-- ----------------------------------------------------------------------------
insert into public.follow_ups (lead_id, dealer_id, agent_id, due_date, status, note, completed_at) values
  -- overdue (pending, past due)
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', current_date - 2, 'pending', 'Call back re: showroom visit sched, di pa nakakareply',     null),
  ('f0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', current_date - 1, 'pending', 'Follow up on Innova quotation, competitor also offered',    null),
  ('f0000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', current_date - 2, 'pending', 'Confirm proposal presentation slot for Vios',               null),
  -- missed
  ('f0000000-0000-0000-0000-000000000018', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', current_date - 5, 'missed',  'Initial call attempt, no answer twice',                     null),
  -- due today
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', current_date,     'pending', 'Send Vios DP promo computation via Messenger',              null),
  ('f0000000-0000-0000-0000-000000000026', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', current_date,     'pending', 'Call to invite for weekend showroom event',                 null),
  -- upcoming
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', current_date + 1, 'pending', 'Present final Fortuner discount approval from GSM',          null),
  ('f0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', current_date + 2, 'pending', 'Coordinate cash release schedule for Fortuner',             null),
  ('f0000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', current_date + 3, 'pending', 'Prepare Innova release documents, kulang pa ITR',           null),
  ('f0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', current_date + 5, 'pending', 'Follow up bank result for Veloz application',               null),
  -- done
  ('f0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', current_date - 3, 'done',    'Post-release courtesy call, customer very happy with Vios', now() - interval '2 days');

-- ----------------------------------------------------------------------------
-- 8. Promos
-- ----------------------------------------------------------------------------
insert into public.promos (dealer_id, title, model, description, file_url, active, starts_on, ends_on) values
  ('d0000000-0000-0000-0000-000000000001', 'Raize Low Downpayment Promo', 'Raize',
   'Drive home a Toyota Raize with only ₱49,000 all-in downpayment. Includes chattel mortgage fee, 1st year comprehensive insurance, and LTO registration.',
   null, true, current_date - 10, current_date + 30),
  ('d0000000-0000-0000-0000-000000000001', 'Vios 0% Interest', 'Vios',
   'Own a Toyota Vios at 0% interest for up to 36 months financing. Available on select variants through participating banks.',
   null, true, current_date - 10, current_date + 30),
  ('d0000000-0000-0000-0000-000000000001', 'Fortuner Year-End Discount', 'Fortuner',
   'Get up to ₱150,000 cash discount on the Toyota Fortuner. Applicable to cash and financed purchases while stocks last.',
   null, true, current_date - 10, current_date + 30);
