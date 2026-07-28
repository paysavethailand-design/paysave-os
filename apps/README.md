# Applications

แต่ละโฟลเดอร์ภายใต้ `apps/` ต้องเป็น deployable unit ที่ประกอบ feature/package ผ่าน public API เท่านั้น

- `web/`: Next.js application และ BFF boundary

ห้ามวาง shared business logic ที่ root ของ `apps/`; ให้เก็บใน feature owner หรือ package ที่มี contract ชัดเจน
