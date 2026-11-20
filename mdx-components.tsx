import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { ControlShowcase } from './components/ControlShowcase'
import { EnclosureViewer } from './components/EnclosureViewer'
import { BrowserFrame, PhoneFrame, WatchFrame, DialFrame, Demo } from './components/media'
export function useMDXComponents(components = {}) {
  return getDocsMDXComponents({
    BrowserFrame,
    PhoneFrame,
    WatchFrame,
    DialFrame,
    Demo,
    ControlShowcase,
    EnclosureViewer,
    ...components,
  })
}
