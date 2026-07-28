import type { DashboardRepository } from "../../application/ports/dashboard-repository";
import type {
  ActivityRow,
  DashboardModel,
  DashboardPersona,
  DashboardKpi,
} from "../../domain/dashboard";
const trend = [
  { label: "ม.ค.", primary: 64, secondary: 48 },
  { label: "ก.พ.", primary: 72, secondary: 52 },
  { label: "มี.ค.", primary: 69, secondary: 56 },
  { label: "เม.ย.", primary: 82, secondary: 61 },
  { label: "พ.ค.", primary: 88, secondary: 67 },
  { label: "มิ.ย.", primary: 96, secondary: 73 },
];
const distribution = [
  { name: "สำเร็จ", value: 68, color: "#10734f" },
  { name: "กำลังดำเนินการ", value: 22, color: "#0a66c2" },
  { name: "ต้องติดตาม", value: 10, color: "#b54708" },
];
const baseActivity: readonly ActivityRow[] = [
  {
    id: "PS-10482",
    title: "Partner Alpha",
    category: "Mobile",
    owner: "กิตติพงษ์",
    status: "ดำเนินการ",
    statusTone: "info",
    value: "฿128,500",
    updatedAt: "5 นาที",
  },
  {
    id: "PS-10481",
    title: "Partner Green",
    category: "Vehicle",
    owner: "สุภาวดี",
    status: "สำเร็จ",
    statusTone: "success",
    value: "฿92,400",
    updatedAt: "12 นาที",
  },
  {
    id: "PS-10480",
    title: "Partner Blue",
    category: "Device",
    owner: "ธนกร",
    status: "รอตรวจ",
    statusTone: "warning",
    value: "฿76,250",
    updatedAt: "18 นาที",
  },
  {
    id: "PS-10479",
    title: "Partner North",
    category: "Equipment",
    owner: "อัญชลี",
    status: "ต้องติดตาม",
    statusTone: "danger",
    value: "฿51,900",
    updatedAt: "24 นาที",
  },
];
const k = (
  items: readonly [string, string, string, "up" | "down" | "neutral", string][],
): readonly DashboardKpi[] =>
  items.map(([label, value, trendValue, direction, helper]) => ({
    label,
    value,
    trend: trendValue,
    direction,
    helper,
  }));
const models: Record<DashboardPersona, Omit<DashboardModel, "source" | "persona">> = {
  executive: {
    eyebrow: "EXECUTIVE OVERVIEW",
    title: "ภาพรวมธุรกิจที่ตัดสินใจได้ใน 3 วินาที",
    description: "พอร์ต รายรับ ประสิทธิภาพ และความเสี่ยงจากข้อมูลจำลองรอบล่าสุด",
    kpis: k([
      ["มูลค่าพอร์ต", "฿122.89M", "+8.4%", "up", "เทียบเดือนก่อน"],
      ["รับชำระเดือนนี้", "฿3.33M", "+12.4%", "up", "เป้าหมาย 78%"],
      ["อัตราสำเร็จ", "70.0%", "+4.1%", "up", "สูงกว่า SLA"],
      ["รายการเสี่ยง", "48", "-9.8%", "up", "ลดลง 6 รายการ"],
    ]),
    trend,
    distribution,
    activity: baseActivity,
  },
  partner: {
    eyebrow: "PARTNER PERFORMANCE",
    title: "Partner Operations Dashboard",
    description: "ติดตามสัญญา กระแสเงิน และ SLA ของ Partner ด้วยข้อมูลจำลอง",
    kpis: k([
      ["สัญญาที่ดูแล", "4,286", "+6.2%", "up", "Active portfolio"],
      ["ยอดครบกำหนด", "฿8.42M", "+2.8%", "neutral", "รอบเดือนนี้"],
      ["รับชำระแล้ว", "฿6.91M", "+10.1%", "up", "82.1% ของกำหนด"],
      ["Promise to Pay", "312", "-3.2%", "down", "ต้องติดตาม 41"],
    ]),
    trend: trend.map((x) => ({ ...x, primary: x.primary - 8, secondary: x.secondary - 4 })),
    distribution,
    activity: baseActivity.map((x) => ({ ...x, title: "Partner Alpha" })),
  },
  admin: {
    eyebrow: "ADMIN CONTROL",
    title: "Identity, access และระบบพร้อมใช้งาน",
    description: "ภาพรวมผู้ใช้ สิทธิ์ และกิจกรรมระบบจาก Mock Repository",
    kpis: k([
      ["ผู้ใช้ทั้งหมด", "1,248", "+28", "up", "เดือนนี้"],
      ["Active Sessions", "286", "+4.0%", "neutral", "12 Partner"],
      ["Roles", "24", "0", "neutral", "ผ่านการทบทวน"],
      ["Failed Login", "7", "-41%", "up", "24 ชั่วโมง"],
    ]),
    trend: trend.map((x) => ({ ...x, primary: x.primary + 12, secondary: x.secondary + 8 })),
    distribution: [
      { name: "Active", value: 82, color: "#10734f" },
      { name: "Invited", value: 12, color: "#0a66c2" },
      { name: "Suspended", value: 6, color: "#b42318" },
    ],
    activity: baseActivity.map((x, i) => ({
      ...x,
      title:
        ["User invited", "Role updated", "Permission reviewed", "Session revoked"][i] ??
        "System event",
      category: "IAM",
      value: "—",
    })),
  },
  field: {
    eyebrow: "FIELD OPERATIONS",
    title: "งานวันนี้ ชัดเจน พร้อมออกพื้นที่",
    description: "คิวงาน เส้นทาง และผลการปฏิบัติงานของเจ้าหน้าที่จากข้อมูลจำลอง",
    kpis: k([
      ["งานวันนี้", "18", "+3", "neutral", "จากเมื่อวาน"],
      ["เสร็จแล้ว", "11", "61%", "up", "ตามแผน"],
      ["นัดหมายถัดไป", "14:30", "ตรงเวลา", "up", "อีก 24 นาที"],
      ["ระยะทาง", "42 km", "-8 km", "up", "เส้นทางเหมาะสม"],
    ]),
    trend: trend.map((x, i) => ({
      ...x,
      label: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"][i] ?? x.label,
      primary: Math.round(x.primary / 8),
      secondary: Math.round(x.secondary / 9),
    })),
    distribution: [
      { name: "เสร็จแล้ว", value: 61, color: "#10734f" },
      { name: "ระหว่างทาง", value: 22, color: "#0a66c2" },
      { name: "รอดำเนินการ", value: 17, color: "#b54708" },
    ],
    activity: baseActivity.map((x, i) => ({
      ...x,
      title: ["บางนา กม.7", "ลาดพร้าว 101", "รังสิต คลอง 3", "พระราม 2"][i] ?? "จุดหมาย",
      category: "Visit",
      value: ["14:30", "15:15", "16:00", "17:30"][i] ?? "—",
    })),
  },
};
/** In-memory dashboard adapter. It has no network, Supabase or database dependency. */
export class MockDashboardRepository implements DashboardRepository {
  async getDashboard(persona: DashboardPersona): Promise<DashboardModel> {
    return { source: "mock", persona, ...structuredClone(models[persona]) };
  }
}
