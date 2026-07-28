"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@paysave/ui";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { buildBreadcrumbs } from "../domain/breadcrumbs";

/** Renders route-aware breadcrumbs with compact mobile behavior. */
export function AppBreadcrumb() {
  const items = buildBreadcrumbs(usePathname());
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? <BreadcrumbSeparator className="hidden sm:list-item" /> : null}
            <BreadcrumbItem
              className={index < items.length - 2 ? "hidden sm:inline-flex" : undefined}
            >
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href as Route}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
