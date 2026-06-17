"use client";
import { useEffect } from "react";

export function UpdateAdminVisit() {
  useEffect(() => {
    document.cookie = `last_admin_visit=${new Date().toISOString()}; max-age=${60 * 60 * 24 * 90}; path=/; SameSite=Lax`;
  }, []);
  return null;
}
