# Web Shared Layer

Web-only, non-business building blocks. Every folder has one narrow responsibility.

- `config/`: typed runtime configuration.
- `hooks/`: framework-level hooks with no feature semantics.
- `lib/`: pure web utilities with no business vocabulary.
- `providers/`: React providers composed by the app root.
- `services/`: platform adapters only; business services stay inside their feature.
- `types/`: framework-wide web types only; business types stay inside feature domain or contracts.

Do not place feature rules, feature copy, repositories, or Supabase service-role access here.
