# Khadamat - Marketplace de Services au Maroc

Plateforme de mise en relation entre clients et professionnels de services au Maroc.

## 🚀 Stack Technique

**Backend:** NestJS 11 + PostgreSQL + Prisma + Redis  
**Frontend:** Next.js 16 + React + TypeScript + Tailwind CSS

## 🛠️ Installation Rapide

```bash
# Cloner le repo
git clone https://github.com/YassirTHC/Khadamat-V1.git
cd Khadamat-V1

# Backend
cd backend && npm install
cp .env.example .env
# Éditer .env avec vos valeurs
npx prisma generate && npx prisma db push
npm run seed

# Frontend
cd ../frontend && npm install

# Lancer (2 terminaux)
npm run start:dev  # backend (port 4000)
npm run dev        # frontend (port 3000)
```

## 🔐 Configuration

Copier `.env.example` vers `.env` et configurer :
- `DATABASE_URL` : Connexion PostgreSQL
- `JWT_SECRET` : Générer avec `openssl rand -base64 32`
- `REDIS_HOST` : Configuration Redis

## 📞 Support

Créer une [issue](https://github.com/YassirTHC/Khadamat-V1/issues) pour toute question.
