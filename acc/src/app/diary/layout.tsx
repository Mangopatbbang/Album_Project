import DiaryHeader from "@/components/diary/DiaryHeader";

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DiaryHeader />
      {children}
    </>
  );
}
