import { z } from "zod";
export const mockLoginSchema = z
  .object({
    email: z.email("กรุณากรอกอีเมลให้ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  })
  .strict();
export type MockLoginInput = z.infer<typeof mockLoginSchema>;
