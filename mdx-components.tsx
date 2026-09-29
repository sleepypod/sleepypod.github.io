import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { BrowserFrame, PhoneFrame, DialFrame, Demo } from './components/media'
export function useMDXComponents(components = {}) {
  return getDocsMDXComponents({ BrowserFrame, PhoneFrame, DialFrame, Demo, ...components })
}
