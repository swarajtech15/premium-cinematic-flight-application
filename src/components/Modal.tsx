"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";

type ModalContentProps = { onClose: () => void; title: string; children: ReactNode; wide?: boolean };

export function Modal({ open, ...props }: ModalContentProps & { open: boolean }) {
  return <AnimatePresence>{open && <ModalContent {...props} />}</AnimatePresence>;
}

function ModalContent({ onClose, title, children, wide = false }: ModalContentProps) {
  const present = useIsPresent();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!present) return;
    const previousFocus = document.activeElement;
    panel.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [present]);

  return (
    <motion.div
      inert={!present}
      data-lenis-prevent
      className="no-print modal-backdrop fixed inset-0 z-[100] grid place-items-center p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal={present || undefined}
        aria-label={title}
        data-lenis-prevent
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (focusable.length === 0 || document.activeElement === event.currentTarget ||
              (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`card max-h-[92dvh] w-full overflow-y-auto p-6 sm:p-8 ${wide ? "max-w-3xl" : "max-w-md"}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="serif text-3xl font-medium">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-sand-300 hover:bg-cream-200">✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
