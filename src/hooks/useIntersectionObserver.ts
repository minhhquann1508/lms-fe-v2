import { type RefObject, useEffect, useState } from 'react';

export interface IntersectionState {
  isIntersecting: boolean;
  ratio: number;
}

export function useIntersectionObserver(
  ref: RefObject<Element | null> | null | undefined,
  options: IntersectionObserverInit = {},
): IntersectionState {
  const { root = null, rootMargin, threshold } = options;
  const [state, setState] = useState<IntersectionState>({
    isIntersecting: false,
    ratio: 0,
  });

  useEffect(() => {
    const element = ref?.current;

    if (!element) {
      setState({ isIntersecting: false, ratio: 0 });
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setState({
          isIntersecting: entry?.isIntersecting ?? false,
          ratio: entry?.intersectionRatio ?? 0,
        });
      },
      { root, rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, root, rootMargin, threshold]);

  return state;
}
