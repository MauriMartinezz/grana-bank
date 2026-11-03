import Link from "next/link";
import { connection } from "next/server";
import { PromotionCard } from "./promotion-card";
import { listTodayPromotions } from "./queries";

/** Home's "Promos de hoy": today's best few, or nothing when there are none. */
export async function TodayPromotions() {
  // "Today" belongs to the request: prerendering stops here, so the build
  // never freezes a date into the page.
  await connection();
  const promotions = await listTodayPromotions(new Date());
  if (promotions.length === 0) return null;

  return (
    <section aria-labelledby="today-promotions" className="mt-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="today-promotions" className="font-serif text-xl font-bold">
          Promos de hoy
        </h2>
        <Link href="/promociones" className="font-serif text-sm text-garnet">
          Ver todas
        </Link>
      </div>
      <ul className="space-y-3">
        {promotions.map((promotion) => (
          <li key={promotion.id}>
            <PromotionCard promotion={promotion} />
          </li>
        ))}
      </ul>
    </section>
  );
}
