# PAYSAVE Recovery Pre-Migration Checklist v1.1

> **สถานะ: Superseded / Frozen** — ห้ามรัน `0001_paysave_recovery_foundation.sql` เป็น Implementation ของ Stage 2 v2.0; Blueprint ใหม่กำหนด UUID Primary Key และต้องได้รับ Database Gate Approval ก่อนสร้าง SQL ชุดใหม่

| หัวข้อ                   | สถานะ                    | หมายเหตุ                                                                              |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------- |
| Module และขอบเขตตาราง    | ผ่านระดับ Draft          | ครบตามรายการที่ร้องขอ                                                                 |
| Primary Key / Public ID  | ผ่านระดับ Draft          | bigint identity + tenant-scoped UUID                                                  |
| Tenant-aware Foreign Key | ผ่าน Local PostgreSQL 17 | Smoke test ยืนยันว่าการอ้าง Customer ข้าม Partner ถูกปฏิเสธ                           |
| Index Catalog            | ผ่าน Runtime Creation    | สร้าง Index สำเร็จ; ยังต้องยืนยันด้วย `EXPLAIN ANALYZE` จากข้อมูล 10M แถว             |
| Hash Partition 32 ส่วน   | ผ่าน Runtime Creation    | ยังต้อง Load Test ก่อน Production                                                     |
| Monthly Range Partition  | ผ่าน Runtime Creation    | ต้องตั้ง Maintenance Job ล่วงหน้า                                                     |
| RLS                      | ต้องแก้ก่อนใช้งาน App    | เปิดและ Force สำเร็จ 25 Parent Tables แต่ยังไม่มี Policy                              |
| Role/Permission seed     | รอ Business Approval     | ยังไม่สร้างข้อมูล Role จริง                                                           |
| PII Encryption           | รอ Security Design       | Schema รองรับ แต่ยังไม่เลือก KMS/Algorithm                                            |
| Audit immutability       | ผ่าน Local PostgreSQL 17 | Smoke test ยืนยันว่า UPDATE ถูก Trigger ปฏิเสธ; Production ต้องจำกัด Table Owner ด้วย |
| Backup/PITR              | รอ Infrastructure        | ต้องเปิดใน Supabase Production                                                        |
| Migration rollback       | รอจัดทำ                  | Initial DDL ยังไม่มี Down Migration อัตโนมัติ                                         |
| Performance 10M+         | รอ Load Test             | ต้องสร้างข้อมูลจำลองและวัด Query Plan                                                 |
| API                      | ไม่อยู่ใน Scope          | ไม่มีการสร้าง API                                                                     |

## Approval gates

- [ ] ยืนยันว่า Partner คือ Tenant หลัก
- [ ] ยืนยันว่า Customer ไม่แชร์ข้าม Partner โดยอัตโนมัติ
- [ ] ยืนยัน Case Status และ Assignment Status
- [ ] ยืนยัน Payment รองรับ reversal ตามสถานะที่กำหนด
- [ ] ยืนยัน KPI/Commission formula versioning
- [ ] อนุมัติ Retention ของ GPS, Document, Log และ Audit
- [ ] อนุมัติ Role Matrix ก่อนสร้าง RLS Policies
- [ ] Parse DDL ผ่าน PostgreSQL parser
- [ ] รัน Migration บนฐานข้อมูล Staging ว่าง
- [ ] รัน FK/RLS/Partition tests
- [ ] Load test ด้วยข้อมูลจำลองอย่างน้อย 10 ล้านแถว
- [ ] ตรวจ Backup และ Rollback Runbook
