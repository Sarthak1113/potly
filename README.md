# Game Platform

## Stack
- **Backend**: Node.js + Express + MongoDB + JWT
- **Frontend**: React + Vite + Tailwind CSS

## Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

## Quick Start

### 1. Backend
```bash
cd backend
npm install
npm run dev
# Server starts at http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# App starts at http://localhost:5173
```

## Creating an Admin User
Register normally via the UI, then use this API call to create an admin:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@game.com","password":"admin123","role":"admin","adminKey":"supersecretadminkey2024"}'
```

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Wallet
- GET /api/wallet (get balance + transactions)
- POST /api/wallet/redeem (redeem coupon)

### Coupons (Admin only)
- GET /api/coupons
- POST /api/coupons
- PATCH /api/coupons/:id/toggle
- DELETE /api/coupons/:id

### Admin
- GET /api/admin/users
- GET /api/admin/stats
- POST /api/admin/credit
