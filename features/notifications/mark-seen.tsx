"use client";

import { useEffect } from "react";
import { markMyNotificationsSeen } from "./actions";

/**
 * Marks the notifications seen once the screen has shown them, so the
 * unread ones stay highlighted on this visit and the bell clears after it.
 */
export function MarkSeen() {
  useEffect(() => {
    void markMyNotificationsSeen();
  }, []);
  return null;
}
