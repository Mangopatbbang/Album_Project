import type { Metadata } from "next";
import BoardClient from "./BoardClient";

export const metadata: Metadata = {
  title: "문의판",
  description: "공지사항 및 문의 게시판",
};

export default function BoardPage() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>

      <BoardClient />
    </div>
  );
}
