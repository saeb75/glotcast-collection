export const CATEGORIES = {
  title: "Categories",
  subtitle: "How podcasts are grouped on the discover screen, in this order.",
  new: "New category",
  columns: { category: "Category", podcasts: "Podcasts", position: "Order", updated: "Updated" },
  emptyTitle: "No categories",
  emptyBody: "Create categories, then assign them to podcasts.",
  createTitle: "New category",
  editTitle: "Edit category",
  name: "Name",
  slug: "Slug",
  slugHint: (preview: string) =>
    preview ? `Leave empty for “${preview}”.` : "Leave empty to make one from the name.",
  description: "Description",
  cover: "Cover",
  position: "Order",
  positionHint: "Smaller numbers come first.",
  created: "Category created",
  saved: "Category saved",
  deleteTitle: "Delete this category?",
  deleteBody: (name: string, podcasts: number) =>
    podcasts > 0
      ? `“${name}” is removed from its ${podcasts} ${podcasts === 1 ? "podcast" : "podcasts"} and deleted for good.`
      : `“${name}” will be deleted for good.`,
  deleted: "Category deleted",
  errors: {
    name: "Give the category a name.",
    slug: "Lowercase letters, digits and single dashes only.",
    position: "A whole number from 0.",
  },
}
