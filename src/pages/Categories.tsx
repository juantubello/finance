import { useCategories } from "@/hooks/useApi";

export default function Categories() {
  const { data: categories, isLoading, error } = useCategories();

  return (
    <div className="pb-24 max-w-lg mx-auto pt-6 px-5">
      <h1 className="text-lg font-bold text-foreground mb-6">Categorías</h1>

      {error && (
        <div className="p-4 rounded-2xl bg-expense/10 text-expense text-sm mb-4">
          Error al cargar categorías.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-secondary animate-pulse">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 bg-muted rounded w-1/3" />
                <div className="h-2.5 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {categories?.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-4 rounded-2xl shadow-subtle bg-card"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                {c.icon || "📁"}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{c.name}</div>
                {c.description && (
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                )}
              </div>
            </div>
          ))}
          {categories?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              No hay categorías.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
