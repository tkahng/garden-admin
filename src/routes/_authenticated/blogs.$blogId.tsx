import { createFileRoute } from "@tanstack/react-router"
import { BlogDetailPage } from "@/pages/content/blog-detail"

export const Route = createFileRoute("/_authenticated/blogs/$blogId")({
  component: function BlogDetailRoute() {
    const { blogId } = Route.useParams()
    return <BlogDetailPage id={blogId} />
  },
})
