# Etapa 1: Build da aplicação Vite
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Aplicação 100% estática com dados mockados — nenhuma credencial de build necessária
RUN npm run build

# Etapa 2: Servir os arquivos estáticos com Nginx
FROM nginx:alpine AS runner

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia config customizada para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
