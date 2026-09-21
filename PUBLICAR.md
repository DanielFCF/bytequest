# Como publicar: GitHub + Vercel (~10 minutos)

## Parte 1 — GitHub

1. Descompacte o projeto numa pasta, abra o terminal nela e confirme que
   `package.json` e `.gitignore` estão ali (`ls`).
2. Crie o repositório em https://github.com/new
   - Nome: `bytequest`
   - **Visibilidade: Public** ← se ficar privado, o avaliador recebe 404
   - **Não** marque "Add a README file" (o README já está no projeto)
3. No terminal, dentro da pasta:

```bash
git init
git add .
git commit -m "ByteQuest - Challenge Leroy Merlin (FIAP)"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/bytequest.git
git push -u origin main
```

4. Confira no navegador, **deslogado ou numa aba anônima**, que o repositório
   abre. É o teste que pega o erro mais comum desta entrega.

Se o `git push` pedir senha: o GitHub não aceita mais senha de conta. Gere um
token em Settings → Developer settings → Personal access tokens → Tokens
(classic), marque o escopo `repo`, e use o token no lugar da senha.

## Parte 2 — Vercel (link funcional)

1. Acesse https://vercel.com e entre com **Continue with GitHub**.
2. **Add New → Project** → autorize o acesso → selecione `bytequest` → **Import**.
3. Não mude nada: a Vercel detecta Next.js sozinha. Não há variáveis de ambiente.
4. **Deploy**. Em 2–3 minutos sai uma URL do tipo
   `https://bytequest.vercel.app`.
5. **Abra a URL e teste**: entre numa trilha, faça uma missão e entre no painel
   com o código `SOC-2026`. Se as missões carregarem, as rotas de API estão
   funcionando.

## Parte 3 — O que enviar na atividade

| Item | Arquivo / link |
|---|---|
| Arquivo 1 | `Relatorio_Final_Consolidado_ByteQuest.pdf` |
| Arquivo 2 | apresentação da Fase 4 (.pptx) |
| Projeto | link da Vercel **e** link do repositório |

Cole os dois links no campo de texto da atividade, identificados:

```
Aplicação em funcionamento: https://bytequest.vercel.app
Código-fonte: https://github.com/SEU-USUARIO/bytequest
Acesso ao Painel CISO/SOC: código SOC-2026
```

Esse último aviso importa: sem o código, o avaliador não chega no painel
executivo — que é a parte que mais diferencia o projeto.

## Se o deploy falhar

O build foi verificado localmente (`npm run build` sem erros), então falha na
Vercel costuma ser versão de Node. Em Project Settings → General → Node.js
Version, selecione 20 ou superior e refaça o deploy.

## Plano B (sem Vercel)

O enunciado aceita o projeto anexado. Anexe o `.zip` do projeto **sem**
`node_modules` e mantenha o link do GitHub. Mas o link funcionando vale mais:
sem ele, o avaliador precisa instalar Node e rodar `npm install` para ver a
aplicação — e talvez não faça isso.
