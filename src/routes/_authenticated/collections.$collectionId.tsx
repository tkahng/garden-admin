import { createFileRoute } from "@tanstack/react-router"
import { CollectionDetailPage } from "@/pages/collections/detail"

export const Route = createFileRoute("/_authenticated/collections/$collectionId")({
  component: function CollectionDetailRoute() {
    const { collectionId } = Route.useParams()
    return <CollectionDetailPage id={collectionId} />
  },
})
