"use client";

import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined,
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = false,
}: {
  children: ReactNode;
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(true);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: ReactNode;
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open } = useSidebar();
  return (
    <motion.div
      className={cn(
        "hidden h-full shrink-0 overflow-hidden md:flex md:flex-col",
        open ? "w-[320px]" : "w-[76px]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ transform: "translateX(-8%)", opacity: 0 }}
          animate={{ transform: "translateX(0%)", opacity: 1 }}
          exit={{ transform: "translateX(-8%)", opacity: 0 }}
          transition={{
            duration: 0.22,
            ease: [0.23, 1, 0.32, 1],
          }}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-[var(--tray)] p-6 md:hidden",
            className,
          )}
        >
          <button
            type="button"
            className="ghost icon-btn absolute right-4 top-4"
            aria-label="Close tray"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const { open, animate } = useSidebar();
  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center gap-3 py-2 text-sm text-[var(--paper)]",
        className,
      )}
      {...props}
    >
      {link.icon}
      <span
        className={cn(
          "whitespace-nowrap text-sm",
          animate && !open ? "sr-only" : "inline-block",
        )}
      >
        {link.label}
      </span>
    </a>
  );
};
