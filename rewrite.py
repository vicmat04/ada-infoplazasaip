import re

with open('docs/migrations/02-update-rpc-cuatrimestre.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Add p_distrito to function signature
content = re.sub(
    r'(p_provincia text,)\s*(p_infoplaza int)',
    r'\1\n  p_distrito text DEFAULT \'\',\n  \2',
    content
)

# Add p_distrito logic to all queries that check p_provincia
# We'll just replace the p_provincia check with p_provincia AND p_distrito

old_provincia_check = r"AND \(p_provincia = '' OR rs.numero_infoplaza IN \(SELECT numero FROM infoplazas WHERE LOWER\(TRIM\(provincia\)\) = LOWER\(TRIM\(p_provincia\)\)\)\)"
new_provincia_check = r"AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))\n        AND (p_distrito = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(distrito)) = LOWER(TRIM(p_distrito))))"

content = re.sub(old_provincia_check, new_provincia_check, content)

# For ipa.* checks
old_ipa_prov = r"AND \(p_provincia = '' OR LOWER\(TRIM\(ipa.provincia\)\) = LOWER\(TRIM\(p_provincia\)\)\)"
new_ipa_prov = r"AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))\n        AND (p_distrito = '' OR LOWER(TRIM(ipa.distrito)) = LOWER(TRIM(p_distrito)))"

content = re.sub(old_ipa_prov, new_ipa_prov, content)

with open('docs/migrations/03-fix-rpc-distrito-cuatrimestre.sql', 'w', encoding='utf-8') as f:
    f.write(content)
