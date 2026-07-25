import InterceptedAlbumModal from "./InterceptedAlbumModal";

export const runtime = "edge";

export default async function InterceptedAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InterceptedAlbumModal albumId={id} />;
}
