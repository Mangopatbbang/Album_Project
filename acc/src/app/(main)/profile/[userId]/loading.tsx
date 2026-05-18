import Spinner from "@/components/ui/Spinner";
import LoadingMessage from "@/components/ui/LoadingMessage";

export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Spinner size={22} />
      <LoadingMessage />
    </div>
  );
}
