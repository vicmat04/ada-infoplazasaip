import re

with open('src/components/dashboard/Topbar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { Sun, Moon, Bell, Wifi, WifiOff, Menu, Calendar } from 'lucide-react';"
new_import = "import { Sun, Moon, Bell, Wifi, WifiOff, Menu, Calendar, User, LogOut } from 'lucide-react';\nimport { logout } from '../../app/login/actions';"
content = content.replace(old_import, new_import)

# 2. Update TopbarProps
old_props = "  onNavigateToSync?: (anchor: string) => void;\n}"
new_props = "  onNavigateToSync?: (anchor: string) => void;\n  userProfile?: any;\n}"
content = content.replace(old_props, new_props)

# 3. Add destructured userProfile
content = content.replace("onNavigateToSync\n}: TopbarProps) {", "onNavigateToSync,\n  userProfile\n}: TopbarProps) {")
content = content.replace("onNavigateToSync }: TopbarProps) {", "onNavigateToSync, userProfile }: TopbarProps) {")

# 4. Insert User Menu next to Theme selector
user_menu = """
          {/* Menu de Usuario */}
          <div className="flex items-center gap-3 pl-3 ml-1 border-l border-white/10">
            <div className="hidden sm:flex flex-col items-end justify-center">
              <span className="text-[13px] font-bold text-white leading-tight">
                {userProfile ? userProfile.nombre || 'Usuario' : 'Cargando...'}
              </span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                {userProfile ? userProfile.rol || 'admin' : ''}
              </span>
            </div>
            
            <form action={logout} className="m-0 p-0 flex">
              <button 
                type="submit"
                className="p-2 rounded-xl border border-[var(--card-border)] bg-blue-600/10 hover:bg-rose-600/20 text-blue-400 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center justify-center"
                title="Cerrar Sesión"
              >
                <LogOut size={16} className="ml-0.5" />
              </button>
            </form>
          </div>
"""

old_theme = """          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[var(--card-border)] hover:bg-white/5 text-[var(--muted)] hover:text-white transition-all"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>"""

content = content.replace(old_theme, old_theme.replace("</div>", user_menu + "\n        </div>"))

with open('src/components/dashboard/Topbar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
