// TODO: individual prep list view — Phase 2 (core prep workflow)
export default async function PrepListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div>Prep List {id}</div>
}
