with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_topbar = """        <Topbar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          title="Panel Gerencial AIP"
          onMenuClick={() => setIsMobileMenuOpen(true)}
          ultimoCorteDate={syncData?.ultimoCorteDate}
          activeRegional={filters.regional}
          onNavigateToSync={handleNavigateToSync}
        />"""

new_topbar = """        <Topbar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          title="Panel Gerencial AIP"
          onMenuClick={() => setIsMobileMenuOpen(true)}
          ultimoCorteDate={syncData?.ultimoCorteDate}
          activeRegional={filters.regional}
          onNavigateToSync={handleNavigateToSync}
          userProfile={userProfile}
        />"""
content = content.replace(old_topbar, new_topbar)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
