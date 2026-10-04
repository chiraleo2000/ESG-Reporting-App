import React from 'react';

const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'variants',
  'transition',
  'whileHover',
  'whileTap',
  'whileInView',
  'whileFocus',
  'whileDrag',
  'layout',
  'layoutId',
  'custom',
  'drag',
  'dragConstraints',
  'onAnimationComplete',
  'viewport',
  'transformTemplate',
]);

type MotionProps = React.AllHTMLAttributes<HTMLElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  variants?: unknown;
  transition?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
  whileInView?: unknown;
  layout?: unknown;
  layoutId?: unknown;
  custom?: unknown;
};

const cache = new Map<string, React.ForwardRefExoticComponent<MotionProps & React.RefAttributes<HTMLElement>>>();

function createMotion(tag: string) {
  const Component = React.forwardRef<HTMLElement, MotionProps>((props, ref) => {
    const domProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!MOTION_PROPS.has(key)) domProps[key] = value;
    }
    const className = `${String(domProps.className || '')} motion-fade`.trim();
    return React.createElement(tag, { ...domProps, className, ref });
  });
  Component.displayName = `motion.${tag}`;
  return Component;
}

export const motion = new Proxy({} as Record<string, React.ComponentType<MotionProps>>, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') return undefined;
    if (!cache.has(prop)) cache.set(prop, createMotion(prop));
    return cache.get(prop);
  },
});

export const AnimatePresence: React.FC<{ children?: React.ReactNode; mode?: string; initial?: boolean }> = ({ children }) => (
  <>{children}</>
);
