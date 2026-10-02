import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { ControlShowcase } from './components/ControlShowcase'
import { EnclosureViewer } from './components/EnclosureViewer'
import { BrowserFrame, PhoneFrame, DialFrame, Demo } from './components/media'
export function useMDXComponents(components = {}) {
  return getDocsMDXComponents({
    BrowserFrame,
    PhoneFrame,
    DialFrame,
    Demo,
    ControlShowcase,
    EnclosureViewer,
    ...components,
  })
}
