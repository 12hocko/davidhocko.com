"""Slovenská typografia v hotovom HTML: jednopísmenové predložky a spojky
nezostanú na konci riadka, čísla s jednotkami sa nerozdelia.
Upravuje len text medzi značkami, nie atribúty, <style> ani <script>."""
import re, sys, glob
ONE = re.compile(r'(?<![\w&;])([AaIiKkOoSsUuVvZz]) (?=\S)')
NUM = re.compile(r'(\d) (?=(\d{3}\b|%|€|mm\b|produkt|kateg|rok|mesiac|ľud|spolu))')
def fix_text(t):
    t = ONE.sub(r'\1&nbsp;', t)
    t = NUM.sub(r'\1&nbsp;', t)
    t = re.sub(r'(\d) – ', r'\1&nbsp;– ', t)
    t = t.replace('e-shop', '<span style="white-space:nowrap">e-shop</span>')
    return t
def process(html):
    out, i = [], 0
    for m in re.finditer(r'<(script|style)\b.*?</\1>|<[^>]+>', html, flags=re.S):
        out.append(fix_text(html[i:m.start()])); out.append(m.group(0)); i = m.end()
    out.append(fix_text(html[i:]))
    return ''.join(out)
for f in glob.glob(sys.argv[1] + '/*.html'):
    s = open(f, encoding='utf-8').read(); n = process(s)
    if n != s: open(f, 'w', encoding='utf-8').write(n)
