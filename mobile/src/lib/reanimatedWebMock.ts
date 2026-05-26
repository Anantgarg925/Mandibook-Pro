import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

type Callback = (finished?: boolean) => void;

function stripAnimationProps<P extends Record<string, unknown>>(props: P) {
  const {
    entering,
    exiting,
    layout,
    animatedProps,
    ...rest
  } = props;
  return rest;
}

function createAnimatedComponent<TProps extends Record<string, unknown>>(
  Component: React.ComponentType<TProps>
) {
  return React.forwardRef<unknown, TProps>((props, ref) => (
    React.createElement(Component as React.ComponentType<any>, {
      ...stripAnimationProps(props),
      ref,
    })
  ));
}

export function useSharedValue<T>(initialValue: T) {
  return { value: initialValue };
}

export function useAnimatedStyle<T extends Record<string, unknown>>(updater: () => T): T {
  try {
    return updater();
  } catch {
    return {} as T;
  }
}

export function useAnimatedRef<T>() {
  const ref = React.useRef<(((node: T | null) => void) & { current: T | null }) | null>(null);
  if (!ref.current) {
    const callbackRef = ((node: T | null) => {
      callbackRef.current = node;
    }) as ((node: T | null) => void) & { current: T | null };
    callbackRef.current = null;
    ref.current = callbackRef;
  }
  return ref.current;
}

export function useScrollViewOffset() {
  return { value: 0 };
}

export const useScrollOffset = useScrollViewOffset;

export function useDerivedValue<T>(updater: () => T) {
  return { value: updater() };
}

export function useAnimatedReaction() {
  return undefined;
}

export function useAnimatedScrollHandler() {
  return undefined;
}

export function useAnimatedProps<T extends Record<string, unknown>>(updater: () => T): T {
  return useAnimatedStyle(updater);
}

export function useEvent() {
  return undefined;
}

export function useHandler() {
  return { context: {}, doDependenciesDiffer: false, useWeb: true };
}

export function useReducedMotion() {
  return false;
}

export function scrollTo() {
  return undefined;
}

export function measure() {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageX: 0,
    pageY: 0,
  };
}

export function withTiming<T>(toValue: T, _config?: Record<string, unknown>, callback?: Callback): T {
  if (callback) setTimeout(() => callback(true), 0);
  return toValue;
}

export function withSpring<T>(toValue: T, _config?: Record<string, unknown>, callback?: Callback): T {
  if (callback) setTimeout(() => callback(true), 0);
  return toValue;
}

export function withSequence<T>(...values: T[]): T {
  return values[values.length - 1];
}

export function withDelay<T>(_delayMs: number, value: T): T {
  return value;
}

export function withRepeat<T>(value: T): T {
  return value;
}

export function cancelAnimation() {
  return undefined;
}

export function runOnJS<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export function runOnUI<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export function interpolate(value: number, input: number[], output: number[]): number {
  if (input.length === 0 || output.length === 0) return value;
  if (input.length === 1 || output.length === 1) return output[0];
  const startInput = input[0];
  const endInput = input[input.length - 1];
  const startOutput = output[0];
  const endOutput = output[output.length - 1];
  if (endInput === startInput) return startOutput;
  const progress = (value - startInput) / (endInput - startInput);
  return startOutput + progress * (endOutput - startOutput);
}

export const interpolateColor = interpolate;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const Extrapolation = {
  EXTEND: 'extend',
  CLAMP: 'clamp',
  IDENTITY: 'identity',
};

export const Extrapolate = Extrapolation;

const identity = (value: number) => value;

export const Easing = {
  linear: identity,
  quad: (value: number) => value * value,
  out: (easing: (value: number) => number) => (value: number) => 1 - easing(1 - value),
  in: (easing: (value: number) => number) => easing,
  inOut: (easing: (value: number) => number) => easing,
  bezier: () => identity,
};

export const FadeIn = {
  duration() {
    return this;
  },
  delay() {
    return this;
  },
  springify() {
    return this;
  },
};

const Animated = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  Image: createAnimatedComponent(Image),
  ScrollView: createAnimatedComponent(ScrollView),
  Pressable: createAnimatedComponent(Pressable),
  createAnimatedComponent,
};

export default Animated;
