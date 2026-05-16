import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4 space-y-4">
      <nav>
        <Link href="/" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
          Dashboard
        </Link>
        <Link href="/configuracion" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
          Configuración
        </Link>
      </nav>
    </aside>
  );
}
