"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Aviso discreto de que se cortó la conexión.
 *
 * No bloquea nada ni pide hacer nada: el polling reintenta solo cada 2 segundos.
 * Solo aparece para que nadie piense que la app se colgó.
 */
export function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <AnimatePresence>
      {!connected && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          role="status"
          className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-muted ring-1 ring-border"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-danger" />
          Sin conexión, reintentando
        </motion.p>
      )}
    </AnimatePresence>
  );
}
