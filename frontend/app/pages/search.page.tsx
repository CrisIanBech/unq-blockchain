import { useSearchPage } from "@hooks/use-search-page"
import { SearchScreen } from "@components/search-screen/search-screen"

export default function SearchPage() {
  const pageProps = useSearchPage()
  return <SearchScreen {...pageProps} />
}
