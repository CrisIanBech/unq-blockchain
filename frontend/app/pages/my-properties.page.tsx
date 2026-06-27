import { useMyPropertiesPage } from "@hooks/use-my-properties-page"
import { MyPropertiesScreen } from "@components/my-properties-screen/my-properties-screen"

export default function MyPropertiesPage() {
  const pageProps = useMyPropertiesPage()
  return <MyPropertiesScreen {...pageProps} />
}
