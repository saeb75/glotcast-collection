import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { COMMON } from "@/copy/common"

/** "Load more" under a log that pages by cursor. */
export function LoadMoreFooter({ loading, onLoadMore }: { loading: boolean; onLoadMore: () => void }) {
  return (
    <div className="p-2 text-center">
      <Button variant="ghost" size="sm" disabled={loading} onClick={onLoadMore}>
        {loading ? <Spinner /> : null}
        {COMMON.loadMore}
      </Button>
    </div>
  )
}
