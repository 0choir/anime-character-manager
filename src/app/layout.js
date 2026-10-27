import "./globals.css";

export const metadata = {
  title: "アニメキャラ採点管理",
  description: "キャラクターの採点・ランキング・過去の点数表を記録し、比較するアプリ。",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ja"
    >
      <body>{children}</body>
    </html>
  );
}

