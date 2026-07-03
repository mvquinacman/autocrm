-- core enums

create type public.user_role as enum (
  'agent',
  'gsm',
  'sales_director',
  'dealer_principal',
  'admin'
);

create type public.pipeline_stage as enum (
  'new',
  'contacted',
  'showroom',
  'test_drive',
  'application',
  'approved',
  'released'
);

create type public.lead_source as enum (
  'facebook_ads',
  'walk_in',
  'referral',
  'website',
  'other'
);

create type public.activity_type as enum (
  'note',
  'stage_change',
  'call',
  'sms',
  'messenger',
  'showroom_visit',
  'test_drive'
);

create type public.follow_up_status as enum (
  'pending',
  'done',
  'missed'
);
