"use client";

import { useState } from "react";
import { useFinanzasStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface OldCategory {
  id: string;
  name: string;
  group: string;
}

export default function MigratePage() {
  const [migrationStatus, setMigrationStatus] = useState("");
  const [error, setError] = useState("");
  const fetchInitialData = useFinanzasStore((state) => state.fetchInitialData);
  const router = useRouter();

  const handleMigrate = async () => {
    setMigrationStatus("Iniciando migración...");
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Usuario no autenticado. Por favor, iniciá sesión.");
        setMigrationStatus("Migración fallida.");
        return;
      }

      const userId = user.id;

      // 1. Leer localStorage antiguo
      const oldCategoriesString = localStorage.getItem("categories");
      if (!oldCategoriesString) {
        setMigrationStatus("No se encontraron categorías antiguas en localStorage.");
        return;
      }

      const oldCategories: OldCategory[] = JSON.parse(oldCategoriesString);

      if (!oldCategories || oldCategories.length === 0) {
        setMigrationStatus("No hay categorías para migrar.");
        return;
      }

      setMigrationStatus(`Migrando ${oldCategories.length} categorías...`);

      // 2. Preparar datos para inserción en Supabase
      const categoriesToInsert = oldCategories.map((cat) => ({
        user_id: userId,
        name: cat.name,
        group_name: cat.group,
      }));

      // 3. Insertar en public.categories
      const { error: insertError } = await supabase
        .from("categories")
        .insert(categoriesToInsert);

      if (insertError) {
        console.error("Error al insertar categorías:", insertError);
        setError(`Error al guardar categorías en Supabase: ${insertError.message}`);
        setMigrationStatus("Migración fallida.");
        return;
      }

      setMigrationStatus("Migración de grupos y categorías completada exitosamente.");

      // 4. Limpiar estado del store
      await fetchInitialData();

      // Opcional: Redirigir al dashboard o mostrar mensaje de éxito
      router.push("/"); // Redirigir al dashboard después de la migración
    } catch (err: any) {
      console.error("Error durante la migración:", err);
      setError(`Error inesperado durante la migración: ${err.message || err}`);
      setMigrationStatus("Migración fallida.");
    }
  };

  return (
    <div className="p-8 w-full mx-auto space-y-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900">Página de Migración (Fase 1)</h1>
      <p className="text-slate-500">
        Esta página se encargará de migrar tus Grupos y Categorías antiguos de localStorage a Supabase.
        Por favor, asegurate de estar logueado antes de iniciar la migración.
      </p>

      <button
        onClick={handleMigrate}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
        disabled={migrationStatus.startsWith("Iniciando") || migrationStatus.startsWith("Migrando")}
      >
        Iniciar Migración de Grupos y Categorías
      </button>

      {migrationStatus && (
        <p className="text-lg font-medium text-slate-700">{migrationStatus}</p>
      )}

      {error && (
        <p className="text-red-500 text-lg font-medium">Error: {error}</p>
      )}
    </div>
  );
}
