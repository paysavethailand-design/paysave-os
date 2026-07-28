# Supabase CLI Login & Project Link — Human Handoff

**Environment:** Staging only  
**Project:** `paysave-staging`  
**Project Ref:** `rptqfhtanjtrxtfbgrkb`  
**Rule:** ห้ามใช้ Production secrets และห้าม Apply migration ในขั้นตอนนี้

## 1. เปิดโครงการใน VS Code

1. เปิด **Visual Studio Code** บน Mac
2. เลือก **File → Open Folder…**
3. เปิดโฟลเดอร์:

   ```text
   /Users/napusmobilecorporationcompany/paysave-os
   ```

4. เลือก **Terminal → New Terminal**
5. ตรวจตำแหน่ง:

   ```bash
   pwd
   ```

   ต้องแสดง:

   ```text
   /Users/napusmobilecorporationcompany/paysave-os
   ```

## 2. Login Supabase CLI

รัน:

```bash
npx --yes supabase@2.109.1 login --name paysave-staging
```

1. เมื่อขึ้น `Press Enter to open browser` ให้กด **Enter**
2. Browser จะเปิดหน้า Supabase
3. Login ด้วยบัญชีบริษัทที่เป็นสมาชิก Organization `PAYSAVE FIELD HUB STAGING`
4. ยืนยัน/อนุมัติ CLI login
5. หากหน้าเว็บแสดง verification code ให้นำไปกรอก **โดยตรงใน VS Code Terminal เท่านั้น**
6. ห้ามส่ง code, password, token หรือภาพหน้าจอที่มีข้อมูลลับผ่านแชต
7. รอจน Terminal แจ้งว่า login สำเร็จ

> ห้ามใช้ `supabase login --token <ค่า>` เพราะค่าอาจตกค้างใน shell history

## 3. Link เฉพาะ Staging Project

รัน:

```bash
npx --yes supabase@2.109.1 link --project-ref rptqfhtanjtrxtfbgrkb
```

- หากถาม Database password ให้กรอกจาก Password Manager โดยตรงใน Terminal
- ห้ามใส่ password ใน command line, `.env`, Markdown หรือแชต
- หากชื่อ Organization/Project ไม่ตรง ให้กด `Ctrl+C` ทันที

## 4. ตรวจ Project Ref แบบไม่เปิดเผย Secret

รัน:

```bash
if [ "$(cat supabase/.temp/project-ref 2>/dev/null)" = "rptqfhtanjtrxtfbgrkb" ]; then
  echo "STAGING_PROJECT_REF_OK"
else
  echo "PROJECT_REF_MISMATCH_OR_NOT_LINKED"
fi
```

ผลที่ต้องได้:

```text
STAGING_PROJECT_REF_OK
```

จากนั้นตรวจรายการ Project:

```bash
npx --yes supabase@2.109.1 projects list
```

ต้องเห็น:

```text
paysave-staging
rptqfhtanjtrxtfbgrkb
```

## 5. หยุดที่ Human Gate

ห้ามรันคำสั่งเหล่านี้เอง:

```text
supabase db push
supabase migration up
supabase db reset
psql
```

เมื่อ login/link/verification ผ่าน ให้แจ้งเพียง:

```text
Supabase CLI Login: Completed
Project Link: Completed
Project Ref Verification: STAGING_PROJECT_REF_OK
```

ไม่ต้องส่ง output ที่มี key, token, password หรือ connection string

## Troubleshooting

### Browser ไม่เปิด

ใช้ login URL ที่ CLI แสดง โดยเปิดเองใน browser บน Mac เครื่องเดียวกัน ห้ามส่ง URL หรือ verification code ผ่านแชต

### Login ผิดบัญชี

กด `Ctrl+C` ใน Terminal, logout จากบัญชีผิดใน browser แล้วเริ่มข้อ 2 ใหม่

### Link ผิด Project

กด `Ctrl+C` ทันที ห้ามตอบยืนยัน และตรวจว่า Project Ref คือ `rptqfhtanjtrxtfbgrkb`

### `npx` ใช้งานไม่ได้

หยุดและแจ้ง error message โดยลบ/redact token, password และ URL parameters ก่อนส่ง
