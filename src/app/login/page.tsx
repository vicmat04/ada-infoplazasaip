import { login } from './actions'
import { Activity } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const resolvedParams = await searchParams;
  
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-blue-600 p-3 rounded-xl mb-4">
          <Activity size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Infoplazas Analytics</h1>
        <p className="text-slate-400">Inicia sesión con tu cuenta institucional</p>
      </div>

      <form className="animate-fade-in flex flex-col w-full justify-center gap-2 text-foreground glass p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <label className="text-md font-semibold text-slate-300 mb-1" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-lg px-4 py-3 bg-slate-900 border border-slate-700 mb-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
          name="email"
          placeholder="usuario@infoplazas.org.pa"
          required
        />
        <label className="text-md font-semibold text-slate-300 mb-1" htmlFor="password">
          Contraseña
        </label>
        <input
          className="rounded-lg px-4 py-3 bg-slate-900 border border-slate-700 mb-6 text-white focus:outline-none focus:border-blue-500 transition-colors"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        
        <button
          formAction={login}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-4 py-3 mb-2 transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/50"
        >
          Iniciar Sesión
        </button>

        {resolvedParams?.message && (
          <p className="mt-4 p-4 bg-red-900/20 text-red-400 text-center text-sm rounded-lg border border-red-500/20">
            {resolvedParams.message}
          </p>
        )}
      </form>
    </div>
  )
}
