import { RankingScreen } from "@/components/RankingScreen";

export const metadata = { title: "Ranking" };

/**
 * `?tv=1` es el modo proyector: todo mucho más grande, hoja ancha, sin la fila
 * fija del jugador. Pensado para verse desde el fondo del aula.
 */
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tv?: string }>;
}) {
  const { tv } = await searchParams;
  return <RankingScreen tv={tv === "1"} />;
}
