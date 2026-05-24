# TripSync — Collaborative Trip Expense Management Platform

**TripSync** is a production-ready, highly aesthetic, full-stack collaborative trip expense management platform designed for group travels. It simplifies expense tracking, calculates real-time member balances, manages disputes, and generates optimized debt-simplification settlement plans when a trip ends.

TripSync is specifically designed for mobile-resilience during actual travel when network connectivity is unstable.

---

## 🚀 Key Features

1. **Secure Authentication**: Traditional secure JWT token authentication backed by Spring Security using email and password, ensuring encrypted credentials validation and secure session persistence.
2. **Dynamic Theme System**: A fully adaptive styling system shifting smoothly between Dark and Light modes. Visual cards, dashboard charts, interactive forms, and navigation layers instantly transition without colors being hardcoded.
3. **Interactive Spend Analytics**: Premium data dashboards using **Recharts** to visualize overall spending, category breakdowns (Hotel, Food, Transport, etc.), individual spend vs. share comparison bars, and historical spending curves.
4. **Optimized Settlement Engine**: Implementation of a **greedy debt-simplification algorithm** that resolves group balances using the absolute minimum transactions (max $N-1$ payments), eliminating nested peer-to-peer debts.
5. **Real-Time Synchronization**: Spring Boot STOMP WebSocket broker broadcasting immediate changes to connected group members when expenses are added, edited, deleted, disputed, or settled.
6. **Offline-First Resilience**: Automatic client-side caching and offline queue management using **Dexie.js (IndexedDB)**. Users can record expenses in remote/offline settings; metrics are updated locally, and transactions are synchronized in order when a connection is restored.
7. **Group Disputes**: A complete flagging system letting travelers flag suspicious or incorrect expenses, logging dispute reasons, and providing trip leaders/payers quick resolve buttons.

---

## 🛠️ Technology Stack

### Backend
- **Core Platform**: Java 21, Spring Boot 3+
- **Security**: Spring Security + JWT authentication
- **Persistence**: Spring Data JPA + Hibernate
- **Database**: PostgreSQL (with in-memory H2 file backup fallback for local developer boot)
- **Real-Time Communication**: Spring WebSocket STOMP + SockJS broker
- **Documentation**: Springdoc OpenAPI (Swagger UI)

### Frontend
- **Core**: React.js (Vite compiler)
- **Routing**: React Router DOM v6, with history rewrite redirection support
- **HTTP Client**: Axios with JWT injection interceptors
- **Styling**: Tailwind CSS (customized premium slate/emerald glassmorphic design)
- **Local Storage**: Dexie.js (IndexedDB wrapper)
- **Analytics**: Recharts

---

## 📐 Architecture Overview

```mermaid
graph TD
    User[Client Browser / Mobile] <-->|HTTPS / WSS| Frontend[Vite React App]
    Frontend <-->|JWT / JSON API| Gateway[Spring Boot Controller]
    Gateway <-->|WS Connection Broker| WS[WebSocket Controller]
    Gateway -->|Authentication Service| Security[Spring Security JWT]
    Gateway -->|Calculations| Settlement[Settlement Greedy Engine]
    Gateway -->|JPA Repositories| DB[(PostgreSQL / H2 Database)]
    Frontend <-->|Cache Queries| LocalCache[(IndexedDB / Dexie.js)]
```

### Key Modules:
- **`AuthContext.jsx` & `AuthService.java`**: Directs authentication and verification flows, performing secure password hashing, credential validation, and JWT token issuance.
- **`TripContext.jsx` & `ExpenseService.java`**: Coordinates transactional writes. Employs a dual-write mechanism that saves items to the IndexedDB queue locally and transmits them to the Spring Boot REST API. Includes a client-side transaction UUID check to prevent duplications.
- **`SettlementEngine.java`**: Calculates optimized debt clearings on trip finalization.

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)
Create a `.env` file inside the `frontend` folder:
```env
# URL pointing to Spring Boot REST backend
VITE_API_URL=http://localhost:8080
```

### Backend (`backend/src/main/resources/application.yml` / system environment)
Set the following properties via system variables or configuration profiles:
```env
# Server running port
PORT=8080

# Dynamic CORS Allowed Origins (Comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-app.vercel.app

# JWT secret for token signing (256-bit base64-encoded or raw)
JWT_SECRET=your-secure-jwt-secret-key-at-least-256-bits

# PostgreSQL Host configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tripsync
DB_USER=postgres
DB_PASS=postgres

# Alternatively, set the full production connection string (supported by Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/tripsync?sslmode=require
```

---

## 🔌 Setup Instructions

### Prerequisite Environment
- **Java Development Kit**: JDK 17 or 21
- **Node.js**: v18+ (npm v9+)
- **Maven** (optional, standard wrap `./mvnw` is supported)

### 1. Booting the Spring Boot API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Build and launch the application:
   ```bash
   # If Maven is in PATH
   mvn spring-boot:run
   
   # Or using standard maven wrapper (Windows)
   .\mvnw.cmd spring-boot:run
   ```
   *The server initializes at `http://localhost:8080` using in-memory H2 file database fallback.*

### 2. Booting the React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Run Vite dev server:
   ```bash
   npm run dev
   ```
   *Vite compiles assets and hosts the interface on `http://localhost:5173`.*

---

## 🔗 REST API Endpoint Specifications

All core endpoints are protected via `Authorization: Bearer <token>` (except Authentication).

### 🔑 Authentication
- `POST /auth/register` - Create a user account (returns JWT + User details)
- `POST /auth/login` - Authenticate credentials (returns JWT + User details)
- `GET /users/search?email={email}` - Query users by email to add members

### ✈️ Trip Groups
- `POST /trips` - Create a new trip group (creator registered as `LEADER`)
- `GET /trips` - Fetch all trips of the logged-in user
- `GET /trips/{tripId}` - Fetch detailed trip overview (members, configuration)
- `POST /trips/{tripId}/members` - Add a registered user by email
- `DELETE /trips/{tripId}/members/{userId}` - Remove a member (Leader-only)
- `POST /trips/{tripId}/settle` - Lock/Finalize trip and save optimal settlements (Leader-only)

### 💵 Expenses & Splits
- `POST /trips/{tripId}/expenses` - Register an expense (splits equally)
- `GET /trips/{tripId}/expenses` - Fetch expense logs chronologically
- `DELETE /expenses/{expenseId}` - Delete expense (Payer/Leader-only)

### ⚖️ Disputes
- `POST /expenses/{expenseId}/disputes` - Dispute a transaction (logs reason)
- `PUT /disputes/{disputeId}/resolve` - Mark dispute as RESOLVED (Payer/Leader-only)
- `GET /trips/{tripId}/disputes` - Get active dispute log

### 📊 Settlements & Analytics
- `GET /trips/{tripId}/settlements` - Get calculated settlements (active trip) or recorded settlements (settled trip)
- `POST /settlements/{settlementId}/pay` - Toggle a payment settlement transaction as PAID
- `GET /trips/{tripId}/analytics` - Fetch dashboard analytics payload

---

## ⚡ Offline Queue & Sync Engine

TripSync operates under an offline-first philosophy using an **IndexedDB** transaction queue managed by Dexie.js:

1. **Offline Capture**: If `navigator.onLine` is false or the WebSocket connection drops, expense creations are cached inside IndexedDB and stamped with a unique client-side `clientExpenseId` (UUID) and a pending sync flag.
2. **Offline Computations**: The app updates active local trip expenses immediately, letting users see updated balances and totals instantly without a network connection.
3. **Secure Recovery**: Once the network is restored, the synchronization daemon processes the queue in sequential order.
4. **Duplicate Prevention (Double-Lock Guard)**: The backend utilizes a unique transactional constraint on `clientExpenseId`. If a network glitch causes the sync process to execute twice, the database recognizes the UUID and returns the existing payload seamlessly rather than inserting a duplicate expense.

---

## 🧮 Settlement Optimization Engine

To minimize financial transactions among travelers (greedy debt-simplification):

1. **Calculate net balance ($B_i$)** for every group member $i$:
   $$B_i = \text{Total Amount Paid By } i - \text{Total Share Borrowed By } i$$
   - Members with $B_i > 0$ are **Creditors** (deserved money back).
   - Members with $B_i < 0$ are **Debtors** (owe money).
2. **Greedy Matching Engine**:
   - Debtors and Creditors lists are sorted by their absolute net balances.
   - For the largest Debtor $D$ and largest Creditor $C$, compute transaction:
     $$A = \min(|B_D|, B_C)$$
   - Log transaction: **$D$ pays $C$ the amount $A$**.
   - Readjust net balances: $B_D \leftarrow B_D + A$, $B_C \leftarrow B_C - A$.
   - Remove members when their balances drop below $\pm0.01$.
   - Repeat matching until lists are empty.
   This guarantees the absolute minimum transactions (maximum of $N-1$ payments).

---

## 🌐 Cloud Deployment Guide

### Database (Neon PostgreSQL)
1. Register an account at [Neon.tech](https://neon.tech) and create a PostgreSQL project.
2. Retrieve the connection string URI. Make sure it includes `sslmode=require`.
3. Set the `DATABASE_URL` environment variable on your hosting backend to this URI.

### Backend (Render)
1. Log in to [Render](https://render.com) and create a **Web Service**.
2. Connect your Git repository containing the TripSync codebase.
3. Set the build parameters:
   - **Build Command**: `mvn clean package -DskipTests` (inside `backend` directory)
   - **Start Command**: `java -jar target/tripsync-0.0.1-SNAPSHOT.jar`
4. Set the environment variables in the dashboard:
    - `SPRING_PROFILES_ACTIVE`: `prod`
    - `DATABASE_URL`: `your_neon_database_connection_url`
    - `JWT_SECRET`: `your_secure_jwt_secret_key`
    - `ALLOWED_ORIGINS`: `https://your-app.vercel.app`

### Frontend (Vercel)
1. Log in to [Vercel](https://vercel.com) and import the frontend repository.
2. Select **Vite** as the framework preset.
3. Set the root directory to `frontend`.
4. Configure the Build Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Configure Environment Variables:
   - `VITE_API_URL`: `https://your-backend.onrender.com`
6. Deploy. The built-in `vercel.json` rewrite settings will automatically manage React history route reloads.

---

## 🎨 Design & Layout Preview

TripSync implements a high-end visual layout combining glassmorphic grid panels, harmonious custom gradients, micro-animations, and dynamic visual graphs:

- **Dashboard**: Central terminal presenting expense breakdown grids, active trips list, and navigation menus.
- **Trip Details**: Modular panel decomposing expenses logs, members checklist, disputes resolve overlays, and quick billing modals.
- **Spendings Analytics**: Color-coded spend allocations presenting dynamic category charts.
- **Theme Adaptability**: High-contrast, beautifully legible dark and light layouts that adapt seamlessly.
