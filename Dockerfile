FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
