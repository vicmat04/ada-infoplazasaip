import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update import
old_import = "import { getDashboardData, getInfoplazasCatalog, getAvailablePeriods } from './actions';"
new_import = "import { getDashboardData, getInfoplazasCatalog, getAvailablePeriods, getUserProfile } from './actions';"
content = content.replace(old_import, new_import)

# 2. Add userProfile state
old_state = "const [theme, setTheme] = useState<'dark' | 'light'>('dark');"
new_state = "const [theme, setTheme] = useState<'dark' | 'light'>('dark');\n  const [userProfile, setUserProfile] = useState<any>(null);"
content = content.replace(old_state, new_state)

# 3. Fetch userProfile in useEffect (where getAvailablePeriods happens or a separate one)
user_effect = """
  // Auth Fetch
  useEffect(() => {
    getUserProfile().then((res) => {
      if (res?.success) {
        setUserProfile(res.data.profile);
        // Optional: auto-apply regional filter based on profile
        // if (res.data.profile?.regional && res.data.profile?.rol !== 'admin') {
        //   setFilters(prev => ({ ...prev, regional: res.data.profile.regional }));
        // }
      }
    });
  }, []);
"""
old_filters_state = """  const [filters, setFilters] = useState({"""
content = content.replace(old_filters_state, user_effect + "\n" + old_filters_state)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
