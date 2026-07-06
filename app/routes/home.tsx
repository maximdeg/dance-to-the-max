import { useTranslate } from "~/i18n/context";

export function meta() {
  return [{ title: "Dance To the Max" }];
}

export default function Home() {
  const t = useTranslate();
  return (
    <main>
      <h1>{t("app.name")}</h1>
      <p>{t("home.tagline")}</p>
    </main>
  );
}
