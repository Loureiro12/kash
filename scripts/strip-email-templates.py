"""Copia o config.toml sem as seções [auth.email.template.*] (e seus overrides em [remotes.*]).

Uso: strip-email-templates.py <origem> <destino>. Usado por scripts/config-push.sh enquanto o projeto
de produção não tem SMTP próprio (sem ele o Supabase recusa templates customizados).
"""
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()
# remove cada seção de template inteira: do cabeçalho até o próximo cabeçalho ou o fim do arquivo
pattern = r"(?ms)^\[(?:remotes\.[\w-]+\.)?auth\.email\.template\.[\w.]+\]\n.*?(?=^\[|\Z)"
stripped = re.sub(pattern, "", text)
open(dst, "w", encoding="utf-8").write(stripped)
