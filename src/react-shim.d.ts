declare module 'react' {
  export type FC<P = any> = (props: P & { children?: any }) => any
  export function useState<T = any>(initial?: T): [T, (v: T) => void]
  export function useEffect(cb: () => any, deps?: any[]): void
  export function useMemo<T>(cb: () => T, deps?: any[]): T
  const React: { createElement: any }
  export default React
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): { render(node: any): void }
}
