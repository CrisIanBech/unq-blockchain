import { useSmartlockPage } from "@hooks/use-smartlock-page"
import { SmartlockScreen } from "@components/smartlock-screen/smartlock-screen"

export default function SmartlockPage() {
  const pageProps = useSmartlockPage()
  return <SmartlockScreen {...pageProps} />
}
