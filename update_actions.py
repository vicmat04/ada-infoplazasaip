import os

with open('src/app/actions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import { createClient } from '@/lib/supabase/server';\n"
if "import { createClient } from '@/lib/supabase/server';" not in content:
    content = content.replace("'use server';", "'use server';\n\n" + import_statement)

get_profile_func = """
export async function getUserProfile() {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { user, profile } };
  } catch (error: any) {
    console.error('Error in getUserProfile:', error);
    return { success: false, error: error.message };
  }
}
"""

if "getUserProfile" not in content:
    content += "\n" + get_profile_func

with open('src/app/actions.ts', 'w', encoding='utf-8') as f:
    f.write(content)
