import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import { AnimatePresence, MotionValue, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import Link from "next/link";

import { useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({ items, className }: { items: { title: string; icon: React.ReactNode; href: string }[]; className?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div layoutId="nav" className="absolute inset-x-0 bottom-full mb-3 flex flex-wrap justify-center gap-3 max-w-xs mx-auto">
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}>
                <Link
                  href={item.href}
                  key={item.title}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 dark:bg-neutral-800/80 backdrop-blur-md border border-border shadow-lg hover:scale-110 transition-all duration-200"
                  onClick={() => setOpen(false)}>
                  <div className="h-5 w-5">{item.icon}</div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 dark:bg-neutral-800/80 backdrop-blur-md border border-border shadow-lg hover:scale-110 transition-all duration-200">
        <IconLayoutNavbarCollapse className="h-6 w-6 text-foreground" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({ items, className }: { items: { title: string; icon: React.ReactNode; href: string }[]; className?: string }) => {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-center justify-between gap-1 rounded-2xl bg-background/80 px-6 py-3 md:flex dark:bg-neutral-900/80 backdrop-blur-md border border-border shadow-lg",
        className
      )}
      style={{
        width: `${Math.min(items.length * 65 + 48, 800)}px`,
      }}>
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({ mouseX, title, icon, href }: { mouseX: MotionValue; title: string; icon: React.ReactNode; href: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [48, 64, 48]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [48, 64, 48]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 28, 20]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 28, 20]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} className="flex-shrink-0">
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex aspect-square items-center justify-center rounded-full bg-background/60 dark:bg-neutral-800/60 hover:bg-background/80 hover:dark:bg-neutral-700/80 transition-colors duration-200 border border-border/50">
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-10 left-1/2 w-fit rounded-md border border-border bg-background/90 dark:bg-neutral-800/90 backdrop-blur px-2 py-1 text-xs whitespace-pre text-foreground shadow-lg">
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div style={{ width: widthIcon, height: heightIcon }} className="flex items-center justify-center text-foreground">
          {icon}
        </motion.div>
      </motion.div>
    </Link>
  );
}
