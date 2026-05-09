-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone1" TEXT NOT NULL,
    "phone2" TEXT NOT NULL,
    "upiId" TEXT NOT NULL,
    "upiApps" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "grades" TEXT NOT NULL,
    "charges" TEXT NOT NULL,
    "adminPin" TEXT NOT NULL,
    "teamNames" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderCode" TEXT NOT NULL,
    "chlNumber" TEXT NOT NULL,
    "totalKg" REAL NOT NULL,
    "freightAmount" REAL NOT NULL,
    "gradeInventory" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "date" INTEGER NOT NULL,
    "createdAt" INTEGER NOT NULL,
    CONSTRAINT "Truck_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "slipNumber" INTEGER NOT NULL,
    "truckId" TEXT NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "gradeName" TEXT NOT NULL,
    "sacks" INTEGER NOT NULL,
    "weightPerSack" REAL NOT NULL,
    "totalWeight" REAL NOT NULL,
    "ratePerKg" REAL NOT NULL,
    "grossAmount" REAL NOT NULL,
    "apmcAmount" REAL NOT NULL,
    "bardanaAmount" REAL NOT NULL,
    "cartageAmount" REAL NOT NULL,
    "netAmount" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "upiRef" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "date" INTEGER NOT NULL,
    "createdAt" INTEGER NOT NULL,
    CONSTRAINT "Inquiry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "outstandingBalance" REAL NOT NULL DEFAULT 0,
    "lastTransactionDate" INTEGER NOT NULL,
    "lastPaymentAmount" REAL,
    "lastPaymentDate" INTEGER,
    "createdAt" INTEGER NOT NULL,
    CONSTRAINT "Buyer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "buyerCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "upiRef" TEXT,
    "note" TEXT,
    "slipNumber" INTEGER,
    "createdAt" INTEGER NOT NULL,
    CONSTRAINT "Transaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_buyerCode_shopId_fkey" FOREIGN KEY ("buyerCode", "shopId") REFERENCES "Buyer" ("code", "shopId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_shopId_code_key" ON "Buyer"("shopId", "code");
