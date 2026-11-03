import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { listCategories } from "@/features/categories/categories";
import { AddCategoryForm, CategoryRow } from "@/features/categories/category-forms";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  const categories = await listCategories(user.id);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/perfil" />
        <h1 className="font-serif text-2xl font-bold">Categorías</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Ordená tus movimientos para ver más adelante cuánto gastás en cada una. Solo las ves vos.
      </p>

      <AddCategoryForm />

      <div className="mt-6">
        {categories.length > 0 ? (
          <ul aria-label="Tus categorías" className="space-y-px overflow-hidden rounded-2xl">
            {categories.map((category) => (
              // The key includes the name, so a rename resets the row's input.
              <CategoryRow key={`${category.id}:${category.name}`} id={category.id} name={category.name} />
            ))}
          </ul>
        ) : (
          <StateMessage
            title="No tenés categorías"
            description="Agregá una para ordenar tus transferencias, recargas y pagos."
          />
        )}
      </div>
    </>
  );
}
