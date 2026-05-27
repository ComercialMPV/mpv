## Setup para Shared Hosts (sem Download de Browser)

### Pré-requisitos

Este projeto agora usa `playwright` em vez de `puppeteer`, evitando downloads pesados de browser durante `npm install`.

### Instalação no Shared Host

1. **Instalar dependências sem scripts de instalação:**
   ```bash
   cd server
   npm ci --ignore-scripts
   # ou
   npm install --ignore-scripts
   ```

   Também pode usar as flags no `.npmrc` que já estão configuradas:
   ```bash
   npm ci
   ```

2. **Verificar Chromium Instalado:**
   
   No host compartilhado, você precisa de um browser Chromium/Chrome já instalado. Verifique:
   ```bash
   which chromium-browser
   # ou
   which google-chrome
   # ou procure em /usr/bin/
   ls /usr/bin/ | grep -i chrom
   ```

3. **Configurar BROWSER_EXECUTABLE_PATH:**

   Se encontrou o Chromium, adicione ao `.env`:
   ```env
   BROWSER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   # ou
   BROWSER_EXECUTABLE_PATH=/usr/bin/google-chrome
   ```

4. **Iniciar o servidor:**
   ```bash
   npm start
   # ou em desenvolvimento
   npm run dev
   ```

### Se o Chromium Não Está Instalado

Contacte o suporte do host compartilhado e peça para instalar um dos seguintes:
- `chromium-browser` (recomendado, mais leve)
- `google-chrome` ou `google-chrome-stable`

Ou configure um browser remoto (não recomendado para shared hosting por performance):
```env
BROWSER_EXECUTABLE_PATH=ws://remote-browser-service:3000
```

### Troubleshooting

- **Erro: "WebAssembly.instantiate(): Out of memory"** → O host tem pouca memória. Contacte suporte para aumentar RAM/swap.
- **Erro: "Browser not found"** → Defina corretamente `BROWSER_EXECUTABLE_PATH`.
- **PDF generation falha** → Verifique que o browser está acessível e o Node.js tem permissões de leitura/execução.

### Desenvolvimento Local

Em desenvolvimento local, pode deixar `BROWSER_EXECUTABLE_PATH` vazio se tiver Playwright instalado localmente.
