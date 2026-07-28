import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Button,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  Card,
  CardContent,
  Dialog,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  Input,
  Separator,
  Sheet,
  SheetTrigger,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../src/index";

describe("PAYSAVE UI primitives", () => {
  it("renders a blue primary button with an accessible disabled state", () => {
    const html = renderToStaticMarkup(<Button disabled>บันทึก</Button>);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("disabled");
    expect(html).toContain("bg-primary");
  });

  it("renders a glass card using reusable card regions", () => {
    const html = renderToStaticMarkup(
      <Card variant="glass">
        <CardContent>เนื้อหา</CardContent>
      </Card>,
    );
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("backdrop-blur");
    expect(html).toContain('data-slot="card-content"');
  });

  it("exposes invalid input state to assistive technology", () => {
    const html = renderToStaticMarkup(<Input aria-invalid="true" />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('data-slot="input"');
  });

  it("wraps tables for responsive horizontal scrolling", () => {
    const html = renderToStaticMarkup(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>ข้อมูล</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(html).toContain('data-slot="table-container"');
    expect(html).toContain("overflow-x-auto");
  });

  it("renders an accessible dialog trigger", () => {
    const html = renderToStaticMarkup(
      <Dialog>
        <DialogTrigger asChild>
          <Button>เปิด</Button>
        </DialogTrigger>
      </Dialog>,
    );
    expect(html).toContain('data-slot="dialog-trigger"');
    expect(html).toContain("เปิด");
  });

  it("renders avatar, badge and breadcrumb primitives", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>หน้าหลัก</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const avatar = renderToStaticMarkup(
      <Avatar>
        <AvatarFallback>PS</AvatarFallback>
      </Avatar>,
    );
    const badge = renderToStaticMarkup(<Badge variant="success">พร้อม</Badge>);
    expect(html).toContain('aria-label="breadcrumb"');
    expect(avatar).toContain("PS");
    expect(badge).toContain("พร้อม");
  });

  it("renders menu and responsive sheet triggers", () => {
    const menu = renderToStaticMarkup(
      <DropdownMenu>
        <DropdownMenuTrigger>เมนู</DropdownMenuTrigger>
      </DropdownMenu>,
    );
    const sheet = renderToStaticMarkup(
      <Sheet>
        <SheetTrigger>เปิดเมนู</SheetTrigger>
      </Sheet>,
    );
    const separator = renderToStaticMarkup(<Separator />);
    expect(menu).toContain('data-slot="dropdown-menu-trigger"');
    expect(sheet).toContain('data-slot="sheet-trigger"');
    expect(separator).toContain('data-slot="separator"');
  });
});
