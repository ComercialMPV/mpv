# Usa uma imagem base oficial do Node
FROM node:18-slim

# Instala dependências necessárias para o Chrome (Puppeteer)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configura o diretório de trabalho
WORKDIR /app

# Copia package.json e instala
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Define variáveis de ambiente necessárias
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expõe a porta e inicia
EXPOSE 5000
CMD ["npm", "start"]