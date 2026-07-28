# Scripts

เก็บ repository automation เช่น boundary validation, migration verification และ release checks เท่านั้น

- `check-architecture.mjs`: ตรวจ Feature public API, cross-feature import, dependency direction และ package deep import; fail ด้วย non-zero exit code
- `check-architecture.test.mjs`: Node test suite ของ architecture checker

Script ต้อง deterministic, ไม่บรรจุ secret และไม่ตัดสิน Business Rule แทน Feature/Application layer
