import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'
export const generateStaticParams = generateStaticParamsFor('mdxPath')
type Props = { params: Promise<{ mdxPath?: string[] }> }
export async function generateMetadata(props: Props) {
  const { metadata } = await importPage((await props.params).mdxPath)
  return metadata
}
export default async function Page(props: Props) {
  const params = await props.params
  const { default: Content, ...rest } = await importPage(params.mdxPath)
  const Wrapper = getMDXComponents().wrapper!
  return (
    <Wrapper {...rest}>
      <Content {...props} params={params} />
    </Wrapper>
  )
}
