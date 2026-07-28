# @paysave/testing

Boundary สำหรับ test builders, deterministic fixtures และ shared test setup

Production package ห้าม import package นี้ และ fixture ต้องเป็น synthetic data เท่านั้น

## Backend Sprint #1: fake Supabase client

`FakeSupabaseClient`/`FakeQueryBuilder` double the chainable `supabase-js` PostgREST builder
(`.schema(x).from(y).select().eq()...`) so feature Repository implementations can be tested without a
live database. Configure one response per expected `.from(...)` call, in call order, and assert on
`recordedCalls()` to verify the exact schema/table/filter/mutation shape a repository sent.
